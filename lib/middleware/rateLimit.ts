/**
 * Rate limiting middleware para API Routes (in-memory, sliding window).
 *
 * Limitaciones (Vercel serverless):
 * - Cada instancia serverless tiene su propio Map en memoria.
 * - Un cold start resetea los contadores de esa instancia.
 * - No hay coordinación entre instancias concurrentes.
 *
 * Esto provee protección "best-effort" suficiente para prevenir
 * abuso obvio (loops, bots, errores de cliente que bombardean).
 * Para rate limiting distribuido estricto, usar Upstash Redis o Vercel WAF.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  /** Ventana de tiempo en milisegundos */
  windowMs: number;
  /** Máximo de requests permitidos en la ventana */
  maxRequests: number;
}

/** Stores por nombre de limiter. Cada store: identifier → timestamps[] */
const stores = new Map<string, Map<string, number[]>>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // Limpiar entradas viejas cada 60s

function getStore(name: string): Map<string, number[]> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

/**
 * Crea un rate limiter con nombre único.
 * Retorna una función `check(identifier)` que valida si el request está permitido.
 */
export function createRateLimiter(name: string, config: RateLimitConfig) {
  const store = getStore(name);

  return function check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
  } {
    const now = Date.now();

    // Cleanup periódico (solo en la instancia que lo necesite)
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      for (const [, s] of stores) {
        for (const [key, timestamps] of s) {
          const valid = timestamps.filter((t) => now - t < config.windowMs);
          if (valid.length === 0) {
            s.delete(key);
          } else {
            s.set(key, valid);
          }
        }
      }
    }

    // Filtrar timestamps dentro de la ventana
    const timestamps = (store.get(identifier) || []).filter(
      (t) => now - t < config.windowMs
    );

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        resetMs: oldestInWindow + config.windowMs - now,
      };
    }

    timestamps.push(now);
    store.set(identifier, timestamps);

    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      resetMs: config.windowMs,
    };
  };
}

/**
 * Extrae un identificador del request para rate limiting.
 * Prioriza userId (del header o auth context) → IP.
 */
export function getRequestIdentifier(req: NextApiRequest): string {
  // x-forwarded-for es el estándar en Vercel
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ||
    req.socket?.remoteAddress ||
    'unknown';
  return ip;
}

/**
 * Aplica rate limiting a un response. Retorna true si fue bloqueado.
 * Setea headers estándar de rate limit en ambos casos.
 */
export function applyRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limiter: ReturnType<typeof createRateLimiter>,
  identifier?: string
): boolean {
  const id = identifier || getRequestIdentifier(req);
  const result = limiter(id);

  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));

  if (!result.allowed) {
    res.status(429).json({
      error: 'Demasiadas solicitudes. Intentá de nuevo en unos segundos.',
      retryAfterMs: result.resetMs,
    });
    return true;
  }

  return false;
}

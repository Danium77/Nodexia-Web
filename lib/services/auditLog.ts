import type { NextApiRequest } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { AuthContext } from '@/lib/middleware/withAuth';

interface AuditLogEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  status?: 'success' | 'denied' | 'error';
}

/**
 * Registra una acción sensible en audit_log.
 * Diseñado para llamarse desde API routes con withAuth.
 *
 * Uso:
 *   await auditLog(req, authCtx, {
 *     action: 'user.delete',
 *     targetType: 'user',
 *     targetId: userId,
 *     metadata: { email, deleteAll }
 *   });
 */
export async function auditLog(
  req: NextApiRequest,
  auth: AuthContext,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || null;

    await supabaseAdmin.from('audit_log').insert({
      action: entry.action,
      actor_id: auth.userId,
      actor_email: auth.user.email ?? null,
      empresa_id: auth.empresaId,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ip_address: ip,
      status: entry.status ?? 'success',
    });
  } catch {
    // Logging should never break the main flow
    console.error('[audit_log] Failed to write audit entry:', entry.action);
  }
}

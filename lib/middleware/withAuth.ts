/**
 * Middleware genérico de autenticación para API routes.
 *
 * Extrae el usuario del Bearer token y lo pasa al handler.
 * Opcionalmente verifica roles (usa usuarios_empresa.rol_interno).
 *
 * Uso básico (solo auth):
 *   export default withAuth(async (req, res, { user, empresaId }) => { ... });
 *
 * Uso con roles:
 *   export default withAuth(handler, { roles: ['coordinador', 'supervisor'] });
 *
 * El handler recibe un tercer argumento AuthContext con:
 *   - user: User de Supabase Auth
 *   - userId: string (user.id)
 *   - token: string (JWT para crear cliente con RLS)
 *   - empresaId: string | null
 *   - rolInterno: string | null
 *   - tipoEmpresa: string | null
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../supabaseAdmin';

export interface AuthContext {
  user: User;
  userId: string;
  /** JWT token del usuario - usar con createUserSupabaseClient() para queries con RLS */
  token: string;
  empresaId: string | null;
  rolInterno: string | null;
  tipoEmpresa: string | null;
}

export type AuthenticatedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthContext
) => Promise<void | NextApiResponse>;

interface WithAuthOptions {
  /** Roles permitidos (rol_interno). Si se omite, cualquier usuario autenticado pasa. */
  roles?: string[];
}

/**
 * Normaliza valores legacy de rol_interno al formato canónico.
 * Debe coincidir con el mapeo de UserRoleContext.tsx.
 */
function normalizeRole(raw: string | null): string | null {
  if (!raw) return null;
  switch (raw) {
    case 'admin_nodexia':
    case 'Super Admin':
    case 'super_admin':
      return 'admin_nodexia';
    case 'control_acceso':
    case 'Control de Acceso':
      return 'control_acceso';
    case 'supervisor':
    case 'Supervisor':
    case 'Supervisor de Carga':
    case 'supervisor_carga':
      return 'supervisor';
    case 'coordinador':
    case 'Coordinador':
    case 'Coordinador de Transporte':
    case 'coordinador_transporte':
      return 'coordinador';
    case 'chofer':
    case 'Chofer':
      return 'chofer';
    case 'administrativo':
    case 'Operador':
    case 'Administrativo':
      return 'administrativo';
    case 'coordinador_integral':
    case 'Coordinador Integral':
      return 'coordinador_integral';
    case 'vendedor':
    case 'Vendedor':
      return 'vendedor';
    case 'visor':
      return 'visor';
    default:
      console.warn(`[withAuth] Rol desconocido: ${raw} - sin normalizar`);
      return raw;
  }
}

export function withAuth(handler: AuthenticatedHandler, options?: WithAuthOptions) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. Extraer token del header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autenticado: token no proporcionado' });
      }

      const token = authHeader.slice(7);

      // 2. Verificar token con Supabase Auth
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'No autenticado: token inválido' });
      }

      // 3. Obtener empresa_id, rol_interno y tipo_empresa del usuario
      const { data: relacion } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('empresa_id, rol_interno, empresas:empresa_id(tipo_empresa)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const empresaId = relacion?.empresa_id ?? null;
      const rolRaw = relacion?.rol_interno ?? null;
      const rolInterno = normalizeRole(rolRaw);
      const tipoEmpresa = (relacion?.empresas as any)?.tipo_empresa ?? null;

      console.log(`[withAuth] User: ${user.id}, Rol: ${rolInterno}${rolRaw !== rolInterno ? ` (raw: ${rolRaw})` : ''}, Empresa: ${empresaId}`);

      // 4. Verificar rol si se especificó
      if (options?.roles && options.roles.length > 0) {
        if (!rolInterno || !options.roles.includes(rolInterno)) {
          console.error(`[withAuth] Acceso denegado - Rol requerido: ${options.roles.join(', ')}, Actual: ${rolInterno}`);
          return res.status(403).json({
            error: 'Prohibido: rol insuficiente',
            required: options.roles,
            actual: rolInterno,
          });
        }
      }

      // 5. Llamar al handler con el contexto de auth
      const authContext: AuthContext = {
        user,
        userId: user.id,
        token,
        empresaId,
        rolInterno,
        tipoEmpresa,
      };

      return handler(req, res, authContext);
    } catch (error: any) {
      console.error('[withAuth] Error:', error);
      return res.status(500).json({ error: 'Error interno de autenticación' });
    }
  };
}

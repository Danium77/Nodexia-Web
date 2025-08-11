import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../supabaseAdmin';
import { User } from '@supabase/supabase-js';

interface Role {
  name: string;
}

export type NextApiHandlerWithAdmin = (
  req: NextApiRequest,
  res: NextApiResponse,
  adminUser: User
) => Promise<void>;

export function withAdminAuth(handler: NextApiHandlerWithAdmin) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token de autorización no proporcionado.' });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
        return res.status(401).json({ error: 'No autorizado: Token inválido' });
    }

    try {
      const { data: profileUser, error: roleError } = await supabaseAdmin
          .from('profile_users').select('roles(name)').eq('user_id', user.id).single();

      const isAdmin = Array.isArray(profileUser?.roles)
        ? (profileUser.roles as Role[]).some((role) => role.name === 'admin')
        : (profileUser?.roles as Role)?.name === 'admin';

      if (roleError || !isAdmin) {
          return res.status(403).json({ error: 'Prohibido: No eres administrador' });
      }
      return handler(req, res, user);
    } catch (error: any) {
        return res.status(500).json({ error: 'Error al verificar el rol del usuario.', details: error.message });
    }
  };
}

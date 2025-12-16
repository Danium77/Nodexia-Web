// API Route para obtener usuarios de Supabase Auth de forma segura
// Solo accesible por super_admin

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar que el usuario está autenticado
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Crear cliente de Supabase con service role (solo en backend)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // 🔒 Solo disponible en backend
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar que el usuario que llama es super_admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar rol super_admin o admin desde usuarios_empresa
    const { data: usuarioEmpresa } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('rol_interno')
      .eq('user_id', user.id)
      .single();

    if (!usuarioEmpresa || (usuarioEmpresa.rol_interno !== 'super_admin' && usuarioEmpresa.rol_interno !== 'admin')) {
      return res.status(403).json({ error: 'Acceso denegado - Solo super_admin o admin' });
    }

    // Obtener todos los usuarios de Auth
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Ajustar según necesidad
    });

    if (usersError) {
      console.error('Error listando usuarios:', usersError);
      return res.status(500).json({ error: 'Error obteniendo usuarios' });
    }

    // Mapear solo los datos necesarios
    const usuarios = authUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      email_confirmed_at: u.email_confirmed_at,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed_at: u.confirmed_at,
      phone: u.phone,
      user_metadata: u.user_metadata
    }));

    return res.status(200).json({ usuarios });

  } catch (error: any) {
    console.error('[API usuarios-auth] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}

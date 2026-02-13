// API Route para obtener usuarios de Supabase Auth de forma segura
// Solo accesible por admin_nodexia / coordinador

import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener todos los usuarios de Auth
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (usersError) {
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
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });

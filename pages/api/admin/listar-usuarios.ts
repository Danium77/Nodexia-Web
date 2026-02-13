// pages/api/admin/listar-usuarios.ts
import { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { data: users, error: rpcError } = await supabaseAdmin
      .rpc('get_users_with_details');

    if (rpcError) {
      if (rpcError.code === '42883') {
        return res.status(500).json({ error: 'La función "get_users_with_details" no se encontró en la base de datos.' });
      }
      throw rpcError;
    }

    const formattedUsers = users.map((user: any) => ({
      ...user,
      full_name: user.full_name || 'No asignado',
      dni: user.dni || 'No asignado',
      profile_name: user.profile_name || 'No asignado',
      role_name: user.role_name || 'No asignado',
    }));

    res.status(200).json(formattedUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });

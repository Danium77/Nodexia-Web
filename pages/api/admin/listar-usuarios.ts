// pages/api/admin/listar-usuarios.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface Role {
  name: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Verificar que el usuario que hace la petición es un administrador
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token de autorización no proporcionado.' });
    }
    const { data: { user: adminUser }, error: adminUserError } = await supabaseAdmin.auth.getUser(token);
    if (adminUserError || !adminUser) {
      return res.status(401).json({ error: 'No autorizado: Token inválido' });
    }
    const { data: profileUser, error: roleError } = await supabaseAdmin
      .from('profile_users').select('roles(name)').eq('user_id', adminUser.id).single();
    if (Array.isArray(profileUser?.roles)) {
      const isAdmin = (profileUser.roles as Role[]).some((role) => role.name === 'admin');
      if (roleError || !isAdmin) {
        return res.status(403).json({ error: 'Prohibido: No eres administrador' });
      }
    } else {
      const isAdmin = ((profileUser?.roles as unknown) as Role)?.name === 'admin';
      if (roleError || !isAdmin) {
        return res.status(403).json({ error: 'Prohibido: No eres administrador' });
      }
    }

    // 2. Llamar a la función RPC para obtener los datos de los usuarios de forma eficiente.
    // Esta función debe ser creada previamente en la base de datos de Supabase.
    const { data: users, error: rpcError } = await supabaseAdmin
      .rpc('get_users_with_details');

    if (rpcError) {
      console.error('Error al llamar a la función RPC get_users_with_details:', rpcError);
      // Podría ser que la función no exista. Damos un mensaje de error útil.
      if (rpcError.code === '42883') { // routine_does_not_exist
        return res.status(500).json({ error: 'La función "get_users_with_details" no se encontró en la base de datos. Por favor, créala usando el editor SQL de Supabase.' });
      }
      throw rpcError;
    }

    // 3. Rellenar valores nulos para consistencia en la UI
    const formattedUsers = users.map((user: any) => ({
      ...user,
      full_name: user.full_name || 'No asignado',
      dni: user.dni || 'No asignado',
      profile_name: user.profile_name || 'No asignado',
      role_name: user.role_name || 'No asignado',
    }));

    res.status(200).json(formattedUsers);
  } catch (error: any) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}

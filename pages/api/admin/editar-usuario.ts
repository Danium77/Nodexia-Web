import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// NOTA: Es una mejor práctica tener una única instancia del cliente de Supabase para admin compartida en la aplicación.
// Para simplificar esta ruta de API, la creamos aquí.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface Role {
  name: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Verificar que el usuario que hace la petición es un administrador.
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token de autorización no proporcionado.' });
    }

    const { data: { user: adminUser }, error: adminUserError } = await supabaseAdmin.auth.getUser(token);

    if (adminUserError || !adminUser) {
        return res.status(401).json({ error: 'No autorizado: Token inválido.' });
    }

    const { data: profileData, error: roleError } = await supabaseAdmin
        .from('profile_users')
        .select('roles(name)')
        .eq('user_id', adminUser.id)
        .single();

    const isAdmin = Array.isArray(profileData?.roles)
      ? (profileData.roles as Role[]).some((role) => role.name === 'admin')
      : (profileData?.roles as Role)?.name === 'admin';

    if (roleError || !isAdmin) {
      return res.status(403).json({ error: 'Prohibido: No tienes permisos de administrador.' });
    }

    // 2. Obtener los datos requeridos del cuerpo de la petición.
    const { userId, profileId, roleId } = req.body;

    if (!userId || !profileId || !roleId) {
        return res.status(400).json({ error: 'Faltan campos requeridos: userId, profileId, roleId.' });
    }

    // 3. Actualizar el perfil y rol del usuario en la tabla 'profile_users'.
    const { data, error: updateError } = await supabaseAdmin
      .from('profile_users')
      .update({ profile_id: profileId, role_id: roleId })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
        // Manejar errores específicos, por ejemplo, si el usuario a actualizar no se encuentra.
        if (updateError.code === 'PGRST116') { // "PGRST116" es el código de PostgREST para "no se encontró exactamente una fila"
            return res.status(404).json({ error: 'El usuario a editar no fue encontrado.' });
        }
        throw updateError;
    }

    res.status(200).json({ message: 'Usuario actualizado exitosamente.', user: data });

  } catch (error: any) {
    console.error('Error al editar usuario:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}

export default handler;
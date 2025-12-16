// pages/api/admin/crear-usuario.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAdminAuth, type NextApiHandlerWithAdmin } from '../../../lib/middleware/withAdminAuth';

const createUserHandler: NextApiHandlerWithAdmin = async (req, res, _adminUser) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    // 1. La verificación de admin ya fue realizada por el middleware `withAdminAuth`.

    // 2. Obtener los datos del cuerpo de la petición
    const { email, nombre, telefono, profile_id, role_id } = req.body;

    if (!email || !nombre || !telefono || !profile_id || !role_id) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // 3. Crear el usuario en Supabase Auth
    const { data: newUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      // Se recomienda no asignar una contraseña aquí para que el usuario la establezca
      // a través del correo de invitación que Supabase envía.
      email,
      phone: telefono,
      phone_confirm: true, // Auto-confirma el teléfono
      email_confirm: true, // Auto-confirma el email para que el usuario pueda iniciar sesión
      user_metadata: {
        full_name: nombre,
      }
    });

    if (createUserError) {
      if (createUserError.message.includes('User already registered')) {
        return res.status(409).json({ error: 'Un usuario con este email ya existe.' });
      }
      throw createUserError;
    }

    const newUserId = newUserData.user?.id;
    if (!newUserId) throw new Error('El usuario fue creado en Auth, pero no se retornó su ID.');

    // 4. Vincular el usuario con su perfil y rol en la tabla 'profile_users'
    const { error: linkError } = await supabaseAdmin.from('profile_users').insert({
      user_id: newUserId,
      profile_id: profile_id,
      role_id: role_id
    });

    // Si falla la vinculación, borramos el usuario de Auth para mantener la consistencia (Rollback)
    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw linkError;
    }

    // 5. Devolver éxito
    res.status(200).json({ message: 'Usuario creado exitosamente', user: newUserData.user });

  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}

export default withAdminAuth(createUserHandler);

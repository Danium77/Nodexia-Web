// pages/api/admin/crear-usuario.ts
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { email, nombre, telefono, profile_id, role_id } = req.body;

    if (!email || !nombre || !telefono || !profile_id || !role_id) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Crear el usuario en Supabase Auth
    const { data: newUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone: telefono,
      phone_confirm: true,
      email_confirm: true,
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

    // Vincular el usuario con su perfil y rol en la tabla 'profile_users'
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

    res.status(200).json({ message: 'Usuario creado exitosamente', user: newUserData.user });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });

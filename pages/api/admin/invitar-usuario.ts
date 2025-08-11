// pages/api/admin/invitar-usuario.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAdminAuth as withAdminAuth2, type NextApiHandlerWithAdmin as NextApiHandlerWithAdmin2 } from '../../../lib/middleware/withAdminAuth2';

const inviteUserHandler: NextApiHandlerWithAdmin2 = async (req, res, adminUser) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // La verificación de admin ya fue realizada por el middleware `withAdminAuth`.

    // 1. Obtener los datos del cuerpo de la petición
    const { email, profileId, roleId } = req.body;
    if (!email || !profileId || !roleId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: email, profileId, roleId' });
    }

    // 2. Invitar al usuario. Ya no se pasan metadatos; la asociación se hará manualmente.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      if (inviteError.message.includes('User already registered')) {
        return res.status(409).json({ error: 'Un usuario con este email ya existe.' });
      }
      // Error específico para problemas de envío de correo
      if (inviteError.message.includes('Error sending invite email')) {
          console.error('Error de Supabase al enviar email de invitación. Revisa la configuración SMTP en el dashboard de Supabase (posiblemente SendGrid).');
          return res.status(503).json({ error: 'El servidor no pudo enviar el correo de invitación. Por favor, revisa la configuración del proveedor SMTP (SendGrid) en Supabase.' });
      }
      throw inviteError;
    }

    const newUser = inviteData.user;
    if (!newUser) {
      throw new Error('No se pudo obtener la información del usuario recién invitado.');
    }

    // 3. Asociar explícitamente el perfil y rol en la tabla 'profile_users'
    const { error: linkError } = await supabaseAdmin.from('profile_users').insert({
      user_id: newUser.id,
      profile_id: profileId,
      role_id: roleId,
    });

    if (linkError) {
      // Rollback: Si la asociación falla, eliminamos al usuario para evitar datos inconsistentes.
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      console.error('Error al asociar perfil, se eliminó el usuario invitado:', linkError);
      throw new Error(`Error de base de datos al asociar el perfil: ${linkError.message}`);
    }

    res.status(200).json({
      message: 'Invitación enviada y usuario asociado exitosamente.',
      user: newUser
    });

  } catch (error: any) {
    console.error('Error al invitar usuario:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
};

export default withAdminAuth2(inviteUserHandler);

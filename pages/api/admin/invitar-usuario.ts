// pages/api/admin/invitar-usuario.ts
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, profileId, roleId } = req.body;
    if (!email || !profileId || !roleId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: email, profileId, roleId' });
    }

    // Invitar al usuario con URL de redirección personalizada
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-invite`;
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: redirectUrl }
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered')) {
        return res.status(409).json({ 
          error: 'Un usuario con este email ya existe.',
          details: 'Este email ya tiene una cuenta en el sistema.'
        });
      }
      
      if (inviteError.message.includes('Error sending invite email')) {
        return res.status(503).json({ 
          error: 'No se pudo enviar el correo de invitación',
          details: 'El proveedor de email (SMTP) reportó un error.'
        });
      }

      if (inviteError.message.includes('rate limit') || inviteError.message.includes('too many')) {
        return res.status(429).json({
          error: 'Demasiadas invitaciones enviadas',
          details: 'Intenta nuevamente en 1-2 minutos'
        });
      }

      throw inviteError;
    }

    const newUser = inviteData.user;
    if (!newUser) {
      throw new Error('No se pudo obtener la información del usuario recién invitado.');
    }

    // Asociar el perfil y rol en la tabla 'profile_users'
    const { error: linkError } = await supabaseAdmin.from('profile_users').insert({
      user_id: newUser.id,
      profile_id: profileId,
      role_id: roleId,
    });

    if (linkError) {
      // Rollback: Si la asociación falla, eliminamos al usuario
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw new Error(`Error de base de datos al asociar el perfil: ${linkError.message}`);
    }

    res.status(200).json({
      message: 'Invitación enviada y usuario asociado exitosamente.',
      user: newUser,
      detalles: {
        email_enviado_a: email,
        perfil_asignado: profileId,
        rol_asignado: roleId,
        fecha_invitacion: newUser.invited_at,
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });

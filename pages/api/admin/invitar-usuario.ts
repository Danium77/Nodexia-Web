// pages/api/admin/invitar-usuario.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAdminAuth as withAdminAuth2, type NextApiHandlerWithAdmin as NextApiHandlerWithAdmin2 } from '../../../lib/middleware/withAdminAuth2';

const inviteUserHandler: NextApiHandlerWithAdmin2 = async (req, res, _adminUser) => {
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

    // 2. Invitar al usuario con URL de redirección personalizada
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-invite`;
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: redirectUrl }
    );

    if (inviteError) {
      console.error('🚨 Error detallado de Supabase:', {
        message: inviteError.message,
        status: inviteError.status,
        code: inviteError.code || 'N/A',
        timestamp: new Date().toISOString()
      });

      if (inviteError.message.includes('User already registered')) {
        return res.status(409).json({ 
          error: 'Un usuario con este email ya existe.',
          details: 'Este email ya tiene una cuenta en el sistema. Puede intentar hacer login o solicitar un restablecimiento de contraseña.'
        });
      }
      
      // Error específico para problemas de envío de correo
      if (inviteError.message.includes('Error sending invite email')) {
        console.error('❌ Error SMTP - No se pudo enviar email de invitación');
        return res.status(503).json({ 
          error: 'No se pudo enviar el correo de invitación',
          details: 'El proveedor de email (SMTP) reportó un error. Verifica la configuración en el dashboard de Supabase.',
          solucion: 'Ve a Authentication → Email Templates en Supabase y revisa la configuración de tu proveedor SMTP.'
        });
      }

      // Error de rate limit
      if (inviteError.message.includes('rate limit') || inviteError.message.includes('too many')) {
        return res.status(429).json({
          error: 'Demasiadas invitaciones enviadas',
          details: 'Has alcanzado el límite de invitaciones por minuto. Espera un momento antes de enviar otra.',
          reintento: 'Intenta nuevamente en 1-2 minutos'
        });
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

    console.log('✅ Invitación enviada exitosamente:', {
      email: newUser.email,
      userId: newUser.id,
      profileId,
      roleId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Invitación enviada y usuario asociado exitosamente.',
      user: newUser,
      detalles: {
        email_enviado_a: email,
        perfil_asignado: profileId,
        rol_asignado: roleId,
        fecha_invitacion: newUser.invited_at,
        instrucciones: 'El usuario recibirá un email con instrucciones para completar su registro'
      },
      proximos_pasos: [
        'El usuario debe revisar su email (incluyendo carpeta de spam)',
        'Hacer clic en el enlace de invitación recibido',
        'Completar el registro con su información personal',
        'Establecer una contraseña segura'
      ]
    });

  } catch (error: any) {
    console.error('Error al invitar usuario:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
};

export default withAdminAuth2(inviteUserHandler);

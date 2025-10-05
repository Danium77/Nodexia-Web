// pages/api/admin/crear-enlace-manual.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, profileId, roleId } = req.body;
    
    if (!email || !profileId || !roleId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: email, profileId, roleId' });
    }

    // 1. Crear usuario directamente (sin enviar email)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '123!';
    
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // No confirmar automáticamente
      user_metadata: {
        temp_invite: true,
        profile_id: profileId,
        role_id: roleId
      }
    });

    if (createError) {
      if (createError.message.includes('User already registered')) {
        return res.status(409).json({ error: 'Un usuario con este email ya existe.' });
      }
      throw createError;
    }

    const newUser = userData.user;
    if (!newUser) {
      throw new Error('No se pudo crear el usuario.');
    }

    // 2. Asociar explícitamente el perfil y rol
    const { error: linkError } = await supabaseAdmin.from('profile_users').insert({
      user_id: newUser.id,
      profile_id: profileId,
      role_id: roleId,
    });

    if (linkError) {
      // Rollback: eliminar usuario si la asociación falla
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      console.error('Error al asociar perfil, se eliminó el usuario:', linkError);
      throw new Error(`Error de base de datos al asociar el perfil: ${linkError.message}`);
    }

    // 3. Generar enlace de invitación manual
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const inviteToken = Buffer.from(JSON.stringify({
      userId: newUser.id,
      email,
      tempPassword,
      timestamp: Date.now()
    })).toString('base64url');

    const enlaceInvitacion = `${baseUrl}/complete-invite?token=${inviteToken}`;

    // 4. Mensaje completo para copiar y pegar
    const mensajeWhatsApp = `🎉 *Invitación a Nodexia*

Hola! Has sido invitado a usar Nodexia, nuestro sistema de gestión de transporte.

📧 *Tu email:* ${email}
🔑 *Contraseña temporal:* ${tempPassword}

👆 *Instrucciones:*
1. Haz clic en este enlace: ${enlaceInvitacion}
2. Inicia sesión con tu email y la contraseña temporal
3. El sistema te pedirá cambiar la contraseña

⚠️ *Importante:* Por seguridad, cambia tu contraseña en el primer ingreso.

¿Necesitas ayuda? Responde a este mensaje.`;

    const mensajeEmail = `Asunto: Invitación a Nodexia - Sistema de Gestión de Transporte

Estimado/a,

Has sido invitado a usar Nodexia, nuestro sistema de gestión de transporte.

DATOS DE ACCESO:
• Email: ${email}
• Contraseña temporal: ${tempPassword}
• Enlace de acceso: ${enlaceInvitacion}

INSTRUCCIONES:
1. Haz clic en el enlace de acceso
2. Inicia sesión con tu email y contraseña temporal
3. El sistema te pedirá cambiar la contraseña por una de tu elección

IMPORTANTE: Por seguridad, debes cambiar tu contraseña en el primer acceso.

Si tienes algún problema, no dudes en contactarnos.

Saludos cordiales,
Equipo Nodexia`;

    res.status(200).json({
      success: true,
      message: 'Usuario creado exitosamente con enlace manual',
      user: newUser,
      enlaceInvitacion,
      tempPassword,
      mensajeWhatsApp,
      mensajeEmail,
      instrucciones: [
        'El usuario ha sido creado en el sistema',
        'Copia el mensaje de WhatsApp o Email y envíaselo al usuario',
        'El enlace expira en 24 horas por seguridad',
        'El usuario debe cambiar su contraseña en el primer acceso'
      ]
    });

  } catch (error: any) {
    console.error('Error al crear enlace manual:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}
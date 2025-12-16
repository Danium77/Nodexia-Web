// lib/email/sendActivationEmail.ts
// Función para enviar email de activación cuando SMTP esté configurado

/**
 * Envía un email de activación al usuario nuevo
 * 
 * @param email - Email del usuario
 * @param userId - ID del usuario en auth.users
 * @param empresaNombre - Nombre de la empresa
 * @returns Promise<void>
 * 
 * NOTA: Esta función requiere configuración SMTP en variables de entorno:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASSWORD
 * - SMTP_FROM
 * - SMTP_FROM_NAME
 * 
 * Para habilitar:
 * 1. Instalar: npm install nodemailer @types/nodemailer
 * 2. Configurar variables de entorno
 * 3. Descomentar el código de implementación
 * 4. Descomentar la llamada en pages/api/admin/nueva-invitacion.ts
 */

export async function sendActivationEmail(
  email: string,
  userId: string,
  empresaNombre: string
): Promise<void> {
  // TODO: Implementar cuando SMTP esté configurado
  console.log('📧 Email de activación (pendiente de implementar):', {
    to: email,
    userId,
    empresa: empresaNombre
  });
  
  // Implementación cuando esté listo:
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const activationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/activate?token=${userId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Bienvenido a Nodexia</h2>
      <p>Has sido invitado a unirte a <strong>${empresaNombre}</strong> en el sistema Nodexia.</p>
      
      <p>Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente botón:</p>
      
      <a href="${activationLink}" 
         style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Activar mi cuenta
      </a>
      
      <p>O copia y pega este enlace en tu navegador:</p>
      <p style="color: #666; font-size: 12px;">${activationLink}</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Este enlace expira en 24 horas.<br>
        Si no solicitaste esta invitación, puedes ignorar este email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: `Invitación a ${empresaNombre} - Nodexia`,
    html,
  });
  
  console.log('✅ Email de activación enviado a:', email);
  */
}

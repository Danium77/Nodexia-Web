// pages/api/admin/reenviar-invitacion.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, userId } = req.body;
    
    if (!email && !userId) {
      return res.status(400).json({ error: 'Se requiere email o userId' });
    }

    let targetEmail = email;

    // Si se proporciona userId, obtener el email del usuario
    if (userId && !email) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      targetEmail = userData.user.email;
      
      // Verificar si ya está confirmado
      if (userData.user.email_confirmed_at) {
        return res.status(400).json({ 
          error: 'Este usuario ya confirmó su email',
          details: `Confirmado el ${new Date(userData.user.email_confirmed_at).toLocaleString('es-ES')}`
        });
      }
    }

    console.log('🔄 Reenviando invitación a:', targetEmail);

    // Reenviar invitación
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      targetEmail,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/complete-invite`
      }
    );

    if (inviteError) {
      console.error('❌ Error reenviando invitación:', inviteError);
      
      if (inviteError.message.includes('User already registered')) {
        return res.status(409).json({ 
          error: 'Usuario ya registrado',
          details: 'Este email ya tiene una cuenta confirmada'
        });
      }
      
      if (inviteError.message.includes('Error sending invite email')) {
        return res.status(503).json({ 
          error: 'Error de SMTP',
          details: 'No se pudo enviar el email. Verifica la configuración SMTP en Supabase'
        });
      }
      
      throw inviteError;
    }

    console.log('✅ Invitación reenviada exitosamente:', inviteData);
    
    return res.status(200).json({
      success: true,
      message: 'Invitación reenviada exitosamente',
      email: targetEmail,
      user: inviteData.user,
      timestamp: new Date().toISOString(),
      recomendacion: 'Pide al usuario que revise su carpeta de spam si no recibe el email en 5-10 minutos'
    });

  } catch (error: any) {
    console.error('💥 Error reenviando invitación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}
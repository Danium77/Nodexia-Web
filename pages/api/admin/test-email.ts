// pages/api/admin/test-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    console.log('🧪 Intentando enviar email de prueba a:', email);

    // Intentar enviar email de invitación
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/complete-invite`
    });

    // Diagnosticar el resultado
    if (error) {
      console.error('❌ Error completo de Supabase:', JSON.stringify(error, null, 2));
      
      if (error.message.includes('Error sending invite email')) {
        return res.status(503).json({ 
          error: 'Configuración SMTP faltante en Supabase',
          details: 'Necesitas configurar SendGrid, Resend, o otro proveedor SMTP en el dashboard de Supabase',
          solution: 'Ve a Authentication → Email Templates en tu dashboard de Supabase'
        });
      }
      
      if (error.message.includes('User already registered')) {
        return res.status(409).json({ 
          error: 'Usuario ya registrado',
          details: 'Este email ya tiene una cuenta en el sistema'
        });
      }

      return res.status(500).json({ 
        error: error.message,
        code: error.status || error.code,
        details: error
      });
    }

    console.log('✅ Email enviado exitosamente:', data);
    
    return res.status(200).json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      user: data.user,
      details: 'Si no recibe el email, revisa la carpeta de spam o configura SMTP en Supabase'
    });

  } catch (error: any) {
    console.error('💥 Error inesperado:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}
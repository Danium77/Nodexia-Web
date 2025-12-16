// pages/api/admin/diagnosticar-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

interface DiagnosticoEmailResponse {
  success: boolean;
  problema: string;
  detalles: string;
  solucion: string;
  configuracion_detectada: {
    smtp_configurado: boolean;
    error_tipo: string;
    recomendacion: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DiagnosticoEmailResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      problema: 'Método no permitido',
      detalles: 'Solo se acepta POST',
      solucion: 'Usar método POST',
      configuracion_detectada: {
        smtp_configurado: false,
        error_tipo: 'method_error',
        recomendacion: 'Contactar soporte técnico'
      }
    });
  }

  try {
    const { email } = req.body;
    const emailPrueba = email || 'test@example.com';

    console.log('🔍 Diagnosticando configuración de email...');

    // Intentar enviar invitación de prueba
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      emailPrueba,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-invite`
      }
    );

    if (inviteError) {
      console.log('❌ Error detectado:', inviteError);

      // Analizar tipo de error específico
      let problema = 'Error desconocido';
      let detalles = inviteError.message || 'Sin detalles disponibles';
      let solucion = 'Contactar administrador';
      let errorTipo = 'unknown';

      if (inviteError.message?.includes('Error sending invite email')) {
        problema = 'SMTP no configurado en Supabase';
        detalles = 'Supabase no puede enviar emails porque no hay servidor SMTP configurado';
        solucion = 'Configurar SMTP en Dashboard de Supabase → Settings → Auth → SMTP Settings';
        errorTipo = 'smtp_not_configured';
      } else if (inviteError.message?.includes('rate limit')) {
        problema = 'Límite de emails excedido';
        detalles = 'Has enviado demasiados emails en poco tiempo';
        solucion = 'Esperar unos minutos antes de intentar nuevamente';
        errorTipo = 'rate_limit';
      } else if (inviteError.message?.includes('Invalid email')) {
        problema = 'Email inválido';
        detalles = `El email ${emailPrueba} no es válido`;
        solucion = 'Verificar formato del email';
        errorTipo = 'invalid_email';
      } else if (inviteError.message?.includes('User already registered')) {
        problema = 'Usuario ya registrado';
        detalles = `El email ${emailPrueba} ya tiene una cuenta`;
        solucion = 'El usuario puede hacer login directamente o resetear su contraseña';
        errorTipo = 'user_exists';
      }

      return res.status(503).json({
        success: false,
        problema,
        detalles,
        solucion,
        configuracion_detectada: {
          smtp_configurado: false,
          error_tipo: errorTipo,
          recomendacion: errorTipo === 'smtp_not_configured' 
            ? 'Configurar servidor SMTP en Supabase Dashboard'
            : 'Revisar configuración específica'
        }
      });
    }

    // Si llegamos aquí, el email se envió correctamente
    console.log('✅ Email de diagnóstico enviado exitosamente');
    
    return res.status(200).json({
      success: true,
      problema: 'Sin problemas',
      detalles: `Email de diagnóstico enviado correctamente a ${emailPrueba}`,
      solucion: 'Sistema funcionando correctamente',
      configuracion_detectada: {
        smtp_configurado: true,
        error_tipo: 'none',
        recomendacion: 'Sistema funcionando correctamente'
      }
    });

  } catch (error: any) {
    console.error('💥 Error en diagnóstico:', error);
    
    return res.status(500).json({
      success: false,
      problema: 'Error interno',
      detalles: error.message || 'Error desconocido en el servidor',
      solucion: 'Revisar logs del servidor y configuración',
      configuracion_detectada: {
        smtp_configurado: false,
        error_tipo: 'server_error',
        recomendacion: 'Contactar soporte técnico'
      }
    });
  }
}
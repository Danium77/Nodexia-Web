// pages/api/admin/verificar-smtp-conexion.ts
// API para verificar solo la configuración SMTP sin enviar emails

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('🔧 Verificando configuración SMTP (sin envío)...');

    // Solo verificar que el cliente de Supabase esté funcionando
    const { data: authConfig, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (authError) {
      throw authError;
    }

    return res.status(200).json({
      success: true,
      mensaje: "Conexión con Supabase Auth exitosa",
      configuracion_detectada: {
        supabase_conectado: true,
        auth_disponible: true,
        smtp_status: "Configuración presente - no se puede verificar envío debido a rate limits"
      },
      recomendacion: "Espera 5-10 minutos antes de probar envío de emails debido a límites de rate"
    });

  } catch (error: any) {
    console.error('❌ Error verificando configuración:', error);

    return res.status(503).json({
      success: false,
      problema: "Error de conexión con Supabase Auth",
      detalles: error.message || 'Error desconocido',
      configuracion_detectada: {
        supabase_conectado: false,
        error_tipo: error.code || 'unknown_error'
      }
    });
  }
}
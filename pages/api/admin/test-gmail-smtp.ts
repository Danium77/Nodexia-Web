// pages/api/admin/test-gmail-smtp.ts
// Prueba específica para verificar configuración Gmail

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('🔧 Verificando configuración específica de Gmail...');

    // Intentar crear un usuario con email temporal y eliminarlo inmediatamente
    const testEmail = `test-${Date.now()}@temp-nodexia.com`;
    
    console.log(`📧 Creando usuario temporal: ${testEmail}`);

    // Crear usuario sin envío de email primero
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'TempPassword123!',
      email_confirm: true // Confirmar email automáticamente
    });

    if (createError) {
      throw createError;
    }

    const userId = createData.user.id;
    console.log(`✅ Usuario temporal creado: ${userId}`);

    // Ahora intentar enviar invitación al email real
    const { email } = req.body;
    const targetEmail = email || 'waltedanielzaas@gmail.com';

    console.log(`📤 Intentando envío a email real: ${targetEmail}`);

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      targetEmail,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/complete-invite`
      }
    );

    // Limpiar - eliminar usuario temporal
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log(`🗑️ Usuario temporal eliminado`);
    } catch (deleteError) {
      console.warn('⚠️ No se pudo eliminar usuario temporal:', deleteError);
    }

    if (inviteError) {
      console.error('❌ Error específico de Gmail:', inviteError);
      
      // Analizar tipo específico de error
      let problema = 'Error de configuración SMTP';
      let solucion = 'Revisar configuración de Gmail';
      
      if (inviteError.message.includes('rate limit')) {
        problema = 'Límite de emails alcanzado temporalmente';
        solucion = 'Esperar 10-15 minutos antes de reintentar';
      } else if (inviteError.message.includes('authentication')) {
        problema = 'Error de autenticación con Gmail';
        solucion = 'Verificar App Password y credenciales Gmail';
      } else if (inviteError.message.includes('smtp')) {
        problema = 'Configuración SMTP de Gmail incorrecta';
        solucion = 'Revisar Host (smtp.gmail.com), Puerto (587) y credenciales';
      }

      return res.status(200).json({
        success: false,
        test_completed: true,
        problema,
        solucion,
        error_details: {
          code: inviteError.code,
          message: inviteError.message,
          status: inviteError.status
        },
        configuracion_recomendada: {
          host: 'smtp.gmail.com',
          port: '587',
          username: 'tu-email@gmail.com',
          password: 'App Password de 16 caracteres',
          sender_email: 'tu-email@gmail.com',
          sender_name: 'Nodexia'
        },
        pasos_verificacion: [
          '1. Confirmar que guardaste la configuración en Supabase',
          '2. Verificar que el App Password sea correcto (16 caracteres)',
          '3. Confirmar que la cuenta Gmail tenga 2FA activado',
          '4. Probar con otro email de destino',
          '5. Esperar 15 minutos si hay rate limits'
        ]
      });
    }

    return res.status(200).json({
      success: true,
      test_completed: true,
      mensaje: '✅ Configuración Gmail funcionando correctamente',
      email_enviado_a: targetEmail,
      configuracion_detectada: {
        smtp_configurado: true,
        gmail_funcionando: true,
        test_exitoso: true
      }
    });

  } catch (error: any) {
    console.error('❌ Error en test Gmail:', error);

    return res.status(500).json({
      success: false,
      test_completed: false,
      problema: 'Error técnico en la prueba',
      detalles: error.message,
      error_tipo: error.code || 'unknown_error'
    });
  }
}
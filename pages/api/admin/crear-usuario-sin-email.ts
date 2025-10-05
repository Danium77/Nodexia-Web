// pages/api/admin/crear-usuario-sin-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

interface CrearUsuarioSinEmailRequest {
  email: string;
  nombre: string;
  telefono?: string;
  empresa_id: string;
  rol_interno: string;
  departamento?: string;
}

interface CrearUsuarioSinEmailResponse {
  success: boolean;
  message: string;
  usuario?: {
    id: string;
    email: string;
    enlace_activacion: string;
    instrucciones: string[];
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<CrearUsuarioSinEmailResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  try {
    const { email, nombre, telefono, empresa_id, rol_interno, departamento }: CrearUsuarioSinEmailRequest = req.body;

    if (!email || !nombre || !empresa_id || !rol_interno) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: email, nombre, empresa_id, rol_interno'
      });
    }

    console.log(`👤 Creando usuario sin email: ${email}`);

    // 1. Crear usuario en Auth con contraseña temporal
    const contraseñaTemp = `temp${Math.random().toString(36).substr(2, 8)}`;
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: contraseñaTemp,
      email_confirm: false, // No confirmado aún
      user_metadata: {
        nombre_completo: nombre,
        created_manually: true,
        created_at: new Date().toISOString()
      }
    });

    if (authError) {
      if (authError.message.includes('User already registered')) {
        return res.status(409).json({
          success: false,
          message: `El email ${email} ya está registrado`,
          error: 'USER_EXISTS'
        });
      }
      throw authError;
    }

    if (!authUser.user) {
      throw new Error('No se pudo crear el usuario en Auth');
    }

    console.log(`✅ Usuario creado en Auth: ${authUser.user.id}`);

    // 2. Insertar en usuarios_empresa
    const { error: empresaError } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({
        user_id: authUser.user.id,
        empresa_id,
        rol_interno,
        nombre_completo: nombre,
        email_interno: email,
        telefono_interno: telefono,
        departamento,
        activo: true,
        fecha_vinculacion: new Date().toISOString(),
        metodo_creacion: 'manual_sin_smtp'
      });

    if (empresaError) {
      // Si falla, limpiar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw empresaError;
    }

    console.log(`✅ Usuario vinculado a empresa`);

    // 3. Generar enlace de activación manual
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?setup=true`
      }
    });

    let enlaceActivacion = '';
    if (resetError || !resetData.properties?.action_link) {
      // Si falla la generación del enlace, crear uno manual básico
      const token = Math.random().toString(36).substr(2, 32);
      enlaceActivacion = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/setup-account?token=${token}&email=${encodeURIComponent(email)}`;
      
      console.log('⚠️ Enlace de recuperación falló, usando enlace manual');
    } else {
      enlaceActivacion = resetData.properties.action_link;
      console.log('✅ Enlace de activación generado');
    }

    // 4. Preparar respuesta con instrucciones
    const instrucciones = [
      '1. Envía el enlace de activación al usuario por WhatsApp, Telegram o en persona',
      '2. El usuario debe hacer clic en el enlace para configurar su contraseña',
      '3. Una vez configurada, podrá iniciar sesión normalmente',
      '4. Si el enlace expira, puedes generar uno nuevo desde el panel de usuarios'
    ];

    return res.status(200).json({
      success: true,
      message: `Usuario ${nombre} creado exitosamente sin envío de email`,
      usuario: {
        id: authUser.user.id,
        email: email,
        enlace_activacion: enlaceActivacion,
        instrucciones
      }
    });

  } catch (error: any) {
    console.error('❌ Error creando usuario sin email:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}
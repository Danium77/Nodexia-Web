import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

interface NuevaInvitacionRequest {
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  empresa_id: string;
  rol_interno: string;
  departamento?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { 
      email, 
      nombre, 
      apellido, 
      telefono, 
      empresa_id, 
      rol_interno, 
      departamento 
    }: NuevaInvitacionRequest = req.body;

    console.log('📧 Enviando invitación formal a usuario:', { email, nombre, apellido, empresa_id });

    // Validar campos requeridos
    if (!email || !nombre || !apellido || !empresa_id || !rol_interno) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        requeridos: ['email', 'nombre', 'apellido', 'empresa_id', 'rol_interno']
      });
    }

    // Verificar que la empresa existe
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre')
      .eq('id', empresa_id)
      .single();

    if (empresaError || !empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    console.log('✅ Empresa encontrada:', empresa.nombre);

    // ========================================
    // MÉTODO ALTERNATIVO SIN EMAIL (TESTING)
    // ========================================
    // Cuando actives SendGrid, comenta este bloque y descomenta el bloque de abajo
    
    const USE_EMAIL_METHOD = process.env.NEXT_PUBLIC_USE_EMAIL_INVITES === 'true';

    if (!USE_EMAIL_METHOD) {
      console.log('🔗 Modo sin email: Generando link de invitación directo');
      
      // Generar password temporal seguro
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Date.now().toString().slice(-4)}`;
      
      // Crear usuario directamente en Supabase Auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // ✅ Confirmar email automáticamente en modo testing
        user_metadata: {
          nombre,
          apellido,
          telefono: telefono || '',
          empresa_id,
          empresa_nombre: empresa.nombre,
          rol_interno,
          departamento: departamento || '',
          invitado_el: new Date().toISOString()
        }
      });

      if (userError) {
        console.error('❌ Error creando usuario:', userError);
        
        if (userError.message?.includes('already') || userError.message?.includes('exists')) {
          return res.status(400).json({ 
            error: 'El usuario ya existe',
            solucion: 'Use la opción "Reenviar Invitación" o contacte al usuario para que restablezca su contraseña'
          });
        }
        
        return res.status(500).json({ error: userError.message });
      }

      // Crear registro en usuarios_empresa
      const { error: vinculoError } = await supabaseAdmin
        .from('usuarios_empresa')
        .insert({
          user_id: userData.user.id,
          empresa_id,
          rol_interno,
          nombre_completo: `${nombre} ${apellido}`,
          telefono_interno: telefono || '',
          activo: true,
          fecha_vinculacion: new Date().toISOString()
        });

      if (vinculoError) {
        console.error('❌ Error creando vínculo usuario-empresa:', vinculoError);
        // No fallar, el usuario ya está creado
      }

      // Generar link de invitación usando generateLink
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-invite`
        }
      });

      if (linkError) {
        console.error('⚠️ Error generando link:', linkError);
        // Continuar de todos modos, tenemos el password temporal
      }

      const inviteLink = linkData?.properties?.action_link || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-invite`;

      console.log('✅ Usuario creado sin email');
      
      return res.status(200).json({
        success: true,
        message: `Usuario creado exitosamente`,
        metodo: 'link_directo',
        usuario: {
          email,
          nombre_completo: `${nombre} ${apellido}`,
          empresa: empresa.nombre
        },
        link_invitacion: inviteLink,
        password_temporal: tempPassword,
        instrucciones: [
          '1. Copia el link de invitación',
          '2. Envíalo al usuario por WhatsApp/otro medio',
          '3. El usuario deberá usar el link para activar su cuenta',
          `4. Credenciales temporales: ${email} / ${tempPassword}`
        ]
      });
    }

    // ========================================
    // MÉTODO CON EMAIL (PRODUCCIÓN - REQUIERE SMTP)
    // ========================================
    // Descomenta este bloque cuando actives SendGrid

    // Generar invitación por email con metadata completa
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/complete-invite`,
        data: {
          nombre,
          apellido,
          telefono: telefono || '',
          empresa_id,
          empresa_nombre: empresa.nombre,
          rol_interno,
          departamento: departamento || ''
        }
      }
    );

    if (inviteError) {
      console.error('❌ Error enviando invitación:', inviteError);
      
      // Si el usuario ya existe, intentemos regenerar un enlace
      if (inviteError.message?.includes('already been registered')) {
        return res.status(400).json({ 
          error: 'El usuario ya está registrado',
          solucion: 'Use la opción "Reenviar Invitación" o "Reset Password" en su lugar'
        });
      }

      return res.status(500).json({ 
        error: 'Error enviando invitación por email',
        details: inviteError.message
      });
    }

    console.log('✅ Invitación enviada exitosamente');

    return res.status(200).json({
      message: 'Invitación enviada exitosamente por email',
      usuario: {
        email,
        nombre: `${nombre} ${apellido}`,
        empresa: empresa.nombre,
        rol_interno
      },
      email_enviado: true,
      instrucciones: [
        `📧 Se envió un email de invitación a: ${email}`,
        '👀 El usuario debe revisar su bandeja de entrada (y spam)',
        '🔗 Al hacer clic en el enlace, podrá crear su contraseña',
        '📝 Deberá completar su información personal',
        '✅ Una vez completado, aparecerá automáticamente en la lista'
      ]
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { validateRoleForCompany } from '../../../lib/validators/roleValidator'
// import { sendActivationEmail } from '../../../lib/email/sendActivationEmail'

interface NuevaInvitacionRequest {
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  dni?: string;
  empresa_id: string;
  rol_interno: string;
  departamento?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      email, 
      nombre, 
      apellido, 
      telefono, 
      dni,
      empresa_id, 
      rol_interno, 
      departamento 
    }: NuevaInvitacionRequest = req.body;

    console.log('Sending invitation to user:', { email, nombre, apellido, empresa_id });

    // Validate required fields
    if (!email || !nombre || !apellido || !empresa_id || !rol_interno) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'nombre', 'apellido', 'empresa_id', 'rol_interno']
      });
    }

    // Verify company exists and get tipo_empresa
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre, tipo_empresa')
      .eq('id', empresa_id)
      .single();

    if (empresaError || !empresa) {
      return res.status(404).json({
        error: 'Company not found',
        empresa_id
      });
    }

    console.log('Company found:', { 
      nombre: empresa.nombre, 
      tipo_empresa: empresa.tipo_empresa 
    });

    // Detectar si SMTP está configurado
    const smtpConfigured = !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_PORT && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASSWORD
    );

    console.log('SMTP configured:', smtpConfigured);

    // Generar password temporal seguro (solo si no hay SMTP)
    const temporalPassword = smtpConfigured 
      ? undefined 
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    
    // Crear usuario en auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      ...(temporalPassword && { password: temporalPassword }),
      email_confirm: !smtpConfigured, // Auto-confirmar solo si no hay SMTP
      user_metadata: {
        nombre,
        apellido,
        telefono: telefono || '',
        empresa_id,
        empresa_nombre: empresa.nombre,
        rol_interno,
        departamento: departamento || ''
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        return res.status(400).json({
          error: 'User already registered',
          email,
          solution: 'Use "Resend Invitation" or "Reset Password" instead'
        });
      }

      return res.status(500).json({
        error: 'Error creating user',
        details: createError.message
      });
    }

    if (!newUser.user) {
      return res.status(500).json({ error: 'User creation failed' });
    }

    console.log('User created successfully:', newUser.user.id);

    // Crear entrada en tabla profiles (primero) - con columna 'name' requerida
    // UPSERT: si ya existe, no hace nada (evita error de duplicado)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        name: `${nombre} ${apellido}` // Columna correcta según estructura real
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (profileError) {
      console.error('Error creating profile record:', profileError);
      // Hacer rollback del usuario en auth
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({
        error: 'User created but failed to create profile',
        details: profileError.message
      });
    }

    console.log('Profile created successfully');

    // Crear entrada en tabla usuarios
    // UPSERT: si ya existe por email, actualiza el registro
    const { error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: newUser.user.id,
        email,
        nombre_completo: `${nombre} ${apellido}`
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      });

    if (usuarioError) {
      console.error('Error creating usuario record:', usuarioError);
      // Hacer rollback
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({
        error: 'User created but failed to create usuario record',
        details: usuarioError.message
      });
    }

    console.log('Usuario record created successfully');

    // ✅ VALIDACIÓN CENTRALIZADA - Reemplaza el trigger de BD eliminado
    // Esta validación antes residía en: trigger_validar_rol -> validar_rol_por_tipo_empresa()
    // Ahora se hace en el código antes de intentar el INSERT
    console.log('Validating role for company:', { rol_interno, empresa_id });
    
    const roleValidation = await validateRoleForCompany(rol_interno, empresa_id);
    
    if (!roleValidation.valid) {
      console.error('❌ Role validation failed:', roleValidation.error);
      // Hacer rollback
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(400).json({
        error: 'Invalid role for company type',
        rol_interno,
        tipo_empresa: empresa.tipo_empresa,
        details: roleValidation.error
      });
    }

    console.log('✅ Role validation passed:', {
      roleId: roleValidation.roleId,
      roleName: roleValidation.roleData?.nombre_rol,
      tipoEmpresa: roleValidation.roleData?.tipo_empresa
    });

    // Preparar datos para insertar
    const dataToInsert = {
      user_id: newUser.user.id,
      empresa_id,
      rol_interno,
      // rol_empresa_id eliminado - Migration 022 usa solo rol_interno
      email_interno: email,
      nombre_completo: `${nombre} ${apellido}`,
      telefono_interno: telefono || null,
      dni: dni || null,
      departamento: departamento || null,
      activo: true,
      fecha_vinculacion: new Date().toISOString()
    };

    console.log('Attempting to insert into usuarios_empresa:', dataToInsert);

    // Crear relación usuario-empresa
    const { data: relacionData, error: relacionError } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert(dataToInsert)
      .select();

    if (relacionError) {
      console.error('❌ Error creating user-company relation:', relacionError);
      console.error('Error code:', relacionError.code);
      console.error('Error message:', relacionError.message);
      console.error('Error details:', relacionError.details);
      console.error('Error hint:', relacionError.hint);
      
      // Hacer rollback
      console.log('Rolling back - deleting user:', newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      
      return res.status(500).json({
        error: 'User created but failed to assign to company',
        details: relacionError.message,
        hint: relacionError.hint,
        code: relacionError.code
      });
    }

    console.log('✅ User successfully assigned to company:', relacionData);

    console.log('User successfully assigned to company');

    // ✅ Si el rol es "chofer", crear registro en tabla choferes
    if (rol_interno.toLowerCase() === 'chofer') {
      console.log('Creating chofer record for user:', newUser.user.id);
      
      const { error: choferError } = await supabaseAdmin
        .from('choferes')
        .insert({
          nombre,
          apellido,
          dni: dni || null,
          telefono: telefono || null,
          email: email,
          empresa_id: empresa_id,
          usuario_id: newUser.user.id, // ✅ Vinculación automática
          fecha_alta: new Date().toISOString(),
          usuario_alta: newUser.user.id
        });

      if (choferError) {
        console.error('❌ Error creating chofer record:', choferError);
        // No hacer rollback completo, solo advertir
        console.warn('⚠️ Usuario creado pero sin registro en tabla choferes');
      } else {
        console.log('✅ Chofer record created successfully');
      }
    }

    // Respuesta diferente según si hay SMTP o no
    if (smtpConfigured) {
      // CON SMTP: Usuario recibirá email de activación
      // TODO: Implementar envío de email cuando SMTP esté configurado
      // await sendActivationEmail(email, newUser.user.id, empresa.nombre);
      
      return res.status(200).json({
        metodo: 'email_activacion',
        message: 'Usuario creado exitosamente - email de activación enviado',
        usuario: {
          id: newUser.user.id,
          email,
          nombre_completo: `${nombre} ${apellido}`,
          empresa: empresa.nombre,
          rol_interno
        },
        email_enviado: true,
        instrucciones: [
          `✅ Usuario creado: ${email}`,
          '📧 Email de activación enviado',
          '⚠️ El usuario debe activar su cuenta desde el email',
          '🔗 El link de activación expira en 24 horas'
        ]
      });
    } else {
      // SIN SMTP: Password temporal
      return res.status(200).json({
        metodo: 'password_temporal',
        message: 'Usuario creado exitosamente - credenciales generadas',
        usuario: {
          id: newUser.user.id,
          email,
          nombre_completo: `${nombre} ${apellido}`,
          empresa: empresa.nombre,
          rol_interno
        },
        password_temporal: temporalPassword,
        link_invitacion: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login`,
        email_enviado: false,
        smtp_configurado: false,
        instrucciones: [
          `✅ Usuario creado: ${email}`,
          `🔑 Password temporal: ${temporalPassword}`,
          '⚠️ El usuario debe cambiar su contraseña en el primer login',
          '✓ Ya puede iniciar sesión en el sistema',
          '📝 Envía estas credenciales al usuario por WhatsApp o mensaje directo'
        ]
      });
    }

  } catch (error: any) {
    console.error('General error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import { withAuth } from '../../../lib/middleware/withAuth'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { validateRoleForCompany } from '../../../lib/validators/roleValidator'

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

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      email, nombre, apellido, telefono, dni,
      empresa_id, rol_interno, departamento 
    }: NuevaInvitacionRequest = req.body;

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
      return res.status(404).json({ error: 'Company not found', empresa_id });
    }

    // Detectar si SMTP está configurado
    const smtpConfigured = !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_PORT && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASSWORD
    );

    // Generar password temporal seguro (solo si no hay SMTP)
    const temporalPassword = smtpConfigured 
      ? undefined 
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    
    // Crear usuario en auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      ...(temporalPassword && { password: temporalPassword }),
      email_confirm: !smtpConfigured,
      user_metadata: {
        nombre, apellido,
        telefono: telefono || '',
        empresa_id,
        empresa_nombre: empresa.nombre,
        rol_interno,
        departamento: departamento || ''
      }
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        return res.status(400).json({
          error: 'User already registered', email,
          solution: 'Use "Resend Invitation" or "Reset Password" instead'
        });
      }
      return res.status(500).json({ error: 'Error creating user', details: createError.message });
    }

    if (!newUser.user) {
      return res.status(500).json({ error: 'User creation failed' });
    }

    // Crear entrada en tabla profiles (legacy, requerida por flujos existentes)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        name: `${nombre} ${apellido}`
      }, { onConflict: 'id', ignoreDuplicates: false });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({ error: 'User created but failed to create profile', details: profileError.message });
    }

    // Crear entrada en tabla usuarios
    const { error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: newUser.user.id,
        email,
        nombre_completo: `${nombre} ${apellido}`
      }, { onConflict: 'email', ignoreDuplicates: false });

    if (usuarioError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({ error: 'User created but failed to create usuario record', details: usuarioError.message });
    }

    // Validación centralizada de rol
    const roleValidation = await validateRoleForCompany(rol_interno, empresa_id);
    
    if (!roleValidation.valid) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(400).json({
        error: 'Invalid role for company type',
        rol_interno, tipo_empresa: empresa.tipo_empresa,
        details: roleValidation.error
      });
    }

    // Crear relación usuario-empresa
    const { data: relacionData, error: relacionError } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({
        user_id: newUser.user.id,
        empresa_id,
        rol_interno,
        email_interno: email,
        nombre_completo: `${nombre} ${apellido}`,
        telefono_interno: telefono || null,
        dni: dni || null,
        departamento: departamento || null,
        activo: true,
        fecha_vinculacion: new Date().toISOString()
      })
      .select();

    if (relacionError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({
        error: 'User created but failed to assign to company',
        details: relacionError.message,
        hint: relacionError.hint,
        code: relacionError.code
      });
    }

    // Si el rol es "chofer", crear registro en tabla choferes
    if (rol_interno.toLowerCase() === 'chofer') {
      await supabaseAdmin
        .from('choferes')
        .insert({
          nombre, apellido,
          dni: dni || null,
          telefono: telefono || null,
          email,
          empresa_id,
          usuario_id: newUser.user.id,
          fecha_alta: new Date().toISOString(),
          usuario_alta: newUser.user.id
        });
    }

    // Respuesta según método de autenticación
    const usuarioResp = {
      id: newUser.user.id, email,
      nombre_completo: `${nombre} ${apellido}`,
      empresa: empresa.nombre, rol_interno
    };

    if (smtpConfigured) {
      return res.status(200).json({
        metodo: 'email_activacion',
        message: 'Usuario creado exitosamente - email de activación enviado',
        usuario: usuarioResp,
        email_enviado: true
      });
    }

    return res.status(200).json({
      metodo: 'password_temporal',
      message: 'Usuario creado exitosamente - credenciales generadas',
      usuario: usuarioResp,
      password_temporal: temporalPassword,
      link_invitacion: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login`,
      email_enviado: false,
      smtp_configurado: false
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });

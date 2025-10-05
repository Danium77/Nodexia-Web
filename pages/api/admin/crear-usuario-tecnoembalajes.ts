// pages/api/admin/crear-usuario-tecnoembalajes.ts
// API específica para crear usuario Walter en Tecnoembalajes Zayas S.A

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('🏢 Buscando empresa Tecnoembalajes Zayas S.A...');

    // 1. Buscar la empresa por nombre
    const { data: empresas, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre, cuit')
      .ilike('nombre', '%Tecnoembalajes%')
      .limit(1)
      .single();

    if (empresaError) {
      console.error('❌ Error buscando empresa:', empresaError);
      return res.status(404).json({
        success: false,
        error: 'No se encontró la empresa Tecnoembalajes Zayas S.A',
        detalles: empresaError.message,
        solucion: 'Verifica que la empresa existe en la base de datos'
      });
    }

    console.log('✅ Empresa encontrada:', empresas);
    const empresaId = empresas.id;

    // 2. Buscar rol de transporte/coordinador
    const { data: roles, error: rolError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .or('name.ilike.%coordinador%,name.ilike.%transporte%,name.ilike.%despacho%')
      .limit(1)
      .single();

    let rolId = null;
    if (!rolError && roles) {
      rolId = roles.id;
      console.log('✅ Rol encontrado:', roles);
    } else {
      console.warn('⚠️ No se encontró rol específico, usando rol por defecto');
      // Buscar cualquier rol activo
      const { data: defaultRole } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .limit(1)
        .single();
      rolId = defaultRole?.id || null;
    }

    // 3. Datos de Walter
    const userData = {
      email: 'waltedanielzaas@gmail.com',
      nombre: 'Walter Zayas',
      empresa_id: empresaId,
      rol_interno: 'transporte',
      telefono: '+54112769000',
      departamento: 'Operaciones'
    };

    console.log('👤 Creando usuario Walter con datos:', userData);

    // 4. Crear usuario en Auth con contraseña temporal
    const tempPassword = 'TempPass' + Date.now();
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: tempPassword,
      email_confirm: false // No confirmar automáticamente para que use el enlace
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return res.status(400).json({
          success: false,
          error: 'El email ya está registrado',
          email_existente: userData.email,
          solucion: 'Usa el botón "🗑️ Eliminar Usuario" primero para liberar este email'
        });
      }
      throw authError;
    }

    const userId = authUser.user.id;
    console.log('✅ Usuario creado en Auth:', userId);

    // 5. Crear perfil en profile_users si existe la tabla
    if (rolId) {
      try {
        const { error: profileError } = await supabaseAdmin
          .from('profile_users')
          .insert({
            user_id: userId,
            profile_id: empresaId,
            role_id: rolId,
            nombre: userData.nombre
          });
        
        if (profileError) {
          console.warn('⚠️ Error creando profile_users:', profileError.message);
        } else {
          console.log('✅ Perfil creado en profile_users');
        }
      } catch (err) {
        console.warn('⚠️ Tabla profile_users no disponible o error:', err);
      }
    }

    // 6. Crear registro en tabla usuarios si existe
    try {
      const { error: usuarioError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: userId,
          email: userData.email,
          nombre_completo: userData.nombre,
          telefono: userData.telefono,
          empresa_id: empresaId,
          rol_interno: userData.rol_interno,
          departamento: userData.departamento,
          activo: true
        });

      if (usuarioError) {
        console.warn('⚠️ Error creando usuario:', usuarioError.message);
      } else {
        console.log('✅ Usuario creado en tabla usuarios');
      }
    } catch (err) {
      console.warn('⚠️ Tabla usuarios no disponible o error:', err);
    }

    // 7. Generar enlace de activación
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: userData.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/complete-invite`
      }
    });

    if (linkError) {
      console.warn('⚠️ Error generando enlace:', linkError.message);
    }

    const enlaceActivacion = linkData?.properties?.action_link || 
                           `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/complete-invite`;

    console.log('🎉 Usuario Walter creado exitosamente');

    return res.status(200).json({
      success: true,
      message: `Usuario Walter Zayas creado exitosamente en ${empresas.nombre}`,
      usuario: {
        id: userId,
        email: userData.email,
        nombre: userData.nombre,
        empresa: {
          id: empresaId,
          nombre: empresas.nombre,
          cuit: empresas.cuit
        },
        rol: rolId ? { id: rolId } : null,
        enlace_activacion: enlaceActivacion
      },
      instrucciones: [
        '1. Copia el enlace de activación de arriba',
        '2. Envía este mensaje a Walter por WhatsApp/Telegram:',
        '',
        `Hola Walter! 👋`,
        ``,
        `Te hemos creado una cuenta en el sistema Nodexia para ${empresas.nombre}.`,
        ``,
        `Para activar tu cuenta, haz clic en este enlace:`,
        `${enlaceActivacion}`,
        ``,
        `Una vez que hagas clic:`,
        `• Podrás establecer tu contraseña`,
        `• Acceder al sistema como Coordinador de Despachos`,
        `• Gestionar operaciones y despachos`,
        ``,
        `¡Cualquier duda, nos contactas!`,
        ``,
        `Saludos,`,
        `Equipo Nodexia`,
        '',
        '3. Walter hace clic en el enlace y establece su contraseña',
        '4. ¡Listo para usar el sistema!'
      ]
    });

  } catch (error: any) {
    console.error('❌ Error creando usuario Walter:', error);
    return res.status(500).json({
      success: false,
      error: 'Error técnico creando usuario',
      detalles: error.message
    });
  }
}
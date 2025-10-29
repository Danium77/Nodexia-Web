const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://stzfqgyoojsscvvbddiv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Script principal para configurar roles base en la base de datos.
// Ejecutar después de migraciones y antes de crear usuarios demo.
async function setupRoles() {
  console.log('🚀 Configurando roles de empresa...');

  try {
    // Verificar si la tabla roles_empresa ya existe
    const { data: existingRoles, error: checkError } = await supabase
      .from('roles_empresa')
      .select('count')
      .limit(1);

    if (checkError) {
      console.log('📋 Creando tabla roles_empresa...');
      
      // Crear la tabla si no existe
      const { error: createError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS roles_empresa (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            nombre_rol VARCHAR(50) NOT NULL,
            tipo_empresa VARCHAR(20) NOT NULL CHECK (tipo_empresa IN ('coordinador', 'transporte', 'ambos')),
            descripcion TEXT,
            permisos JSONB DEFAULT '{}',
            activo BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Índices para mejorar rendimiento
          CREATE INDEX IF NOT EXISTS idx_roles_empresa_tipo ON roles_empresa(tipo_empresa);
          CREATE INDEX IF NOT EXISTS idx_roles_empresa_activo ON roles_empresa(activo);
        `
      });

      if (createError) {
        throw createError;
      }
    }

    // Insertar roles predefinidos
    const rolesData = [
      // Roles para empresas coordinadoras
      {
        nombre_rol: 'Administrador',
        tipo_empresa: 'coordinador',
        descripcion: 'Acceso completo al sistema',
        permisos: {
          despachos: { crear: true, editar: true, eliminar: true, ver: true },
          flota: { crear: true, editar: true, eliminar: true, ver: true },
          reportes: { crear: true, ver: true },
          usuarios: { crear: true, editar: true, eliminar: true, ver: true }
        }
      },
      {
        nombre_rol: 'Coordinador',
        tipo_empresa: 'coordinador',
        descripcion: 'Gestión de despachos y seguimiento',
        permisos: {
          despachos: { crear: true, editar: true, eliminar: false, ver: true },
          flota: { crear: false, editar: true, eliminar: false, ver: true },
          reportes: { crear: false, ver: true },
          usuarios: { crear: false, editar: false, eliminar: false, ver: true }
        }
      },
      {
        nombre_rol: 'Operador',
        tipo_empresa: 'coordinador',
        descripcion: 'Seguimiento y monitoreo de operaciones',
        permisos: {
          despachos: { crear: false, editar: true, eliminar: false, ver: true },
          flota: { crear: false, editar: false, eliminar: false, ver: true },
          reportes: { crear: false, ver: true },
          usuarios: { crear: false, editar: false, eliminar: false, ver: false }
        }
      },

      // Roles para empresas de transporte
      {
        nombre_rol: 'Administrador',
        tipo_empresa: 'transporte',
        descripcion: 'Acceso completo al sistema de transporte',
        permisos: {
          flota: { crear: true, editar: true, eliminar: true, ver: true },
          choferes: { crear: true, editar: true, eliminar: true, ver: true },
          despachos: { crear: false, editar: true, eliminar: false, ver: true },
          reportes: { crear: true, ver: true },
          usuarios: { crear: true, editar: true, eliminar: true, ver: true }
        }
      },
      {
        nombre_rol: 'Supervisor',
        tipo_empresa: 'transporte',
        descripcion: 'Supervisión de flota y choferes',
        permisos: {
          flota: { crear: true, editar: true, eliminar: false, ver: true },
          choferes: { crear: true, editar: true, eliminar: false, ver: true },
          despachos: { crear: false, editar: true, eliminar: false, ver: true },
          reportes: { crear: false, ver: true },
          usuarios: { crear: false, editar: false, eliminar: false, ver: true }
        }
      },
      {
        nombre_rol: 'Chofer',
        tipo_empresa: 'transporte',
        descripcion: 'Acceso básico para conductores',
        permisos: {
          flota: { crear: false, editar: false, eliminar: false, ver: true },
          choferes: { crear: false, editar: false, eliminar: false, ver: false },
          despachos: { crear: false, editar: true, eliminar: false, ver: true },
          reportes: { crear: false, ver: false },
          usuarios: { crear: false, editar: false, eliminar: false, ver: false }
        }
      },

      // Roles para empresas que hacen ambas funciones
      {
        nombre_rol: 'Administrador General',
        tipo_empresa: 'ambos',
        descripcion: 'Acceso completo a coordinación y transporte',
        permisos: {
          despachos: { crear: true, editar: true, eliminar: true, ver: true },
          flota: { crear: true, editar: true, eliminar: true, ver: true },
          choferes: { crear: true, editar: true, eliminar: true, ver: true },
          reportes: { crear: true, ver: true },
          usuarios: { crear: true, editar: true, eliminar: true, ver: true }
        }
      },
      {
        nombre_rol: 'Coordinador de Operaciones',
        tipo_empresa: 'ambos',
        descripcion: 'Gestión integral de despachos y flota',
        permisos: {
          despachos: { crear: true, editar: true, eliminar: false, ver: true },
          flota: { crear: true, editar: true, eliminar: false, ver: true },
          choferes: { crear: true, editar: true, eliminar: false, ver: true },
          reportes: { crear: false, ver: true },
          usuarios: { crear: false, editar: false, eliminar: false, ver: true }
        }
      }
    ];

    console.log('📝 Insertando roles predefinidos...');

    for (const rol of rolesData) {
      const { data: existing } = await supabase
        .from('roles_empresa')
        .select('id')
        .eq('nombre_rol', rol.nombre_rol)
        .eq('tipo_empresa', rol.tipo_empresa)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('roles_empresa')
          .insert(rol);

        if (insertError) {
          console.error(`❌ Error insertando rol ${rol.nombre_rol} (${rol.tipo_empresa}):`, insertError.message);
        } else {
          console.log(`✅ Rol creado: ${rol.nombre_rol} (${rol.tipo_empresa})`);
        }
      } else {
        console.log(`⏭️  Rol ya existe: ${rol.nombre_rol} (${rol.tipo_empresa})`);
      }
    }

    console.log('🎉 Setup de roles completado exitosamente!');

    // Verificar que los roles se insertaron correctamente
    const { data: finalRoles, error: verifyError } = await supabase
      .from('roles_empresa')
      .select('nombre_rol, tipo_empresa')
      .order('tipo_empresa, nombre_rol');

    if (!verifyError && finalRoles) {
      console.log('\n📋 Roles disponibles:');
      finalRoles.forEach(rol => {
        console.log(`  - ${rol.nombre_rol} (${rol.tipo_empresa})`);
      });
    }

  } catch (error) {
    console.error('❌ Error en setup de roles:', error.message);
    process.exit(1);
  }
}

setupRoles();
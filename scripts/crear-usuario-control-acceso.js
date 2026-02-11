// Script para crear usuario con perfil Control de Acceso
// Ejecutar: node scripts/crear-usuario-control-acceso.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function crearUsuarioControlAcceso() {
  console.log('🚀 Creando usuario con perfil Control de Acceso...\n');

  try {
    // 1. Verificar/crear rol Control de Acceso
    console.log('📋 Verificando rol Control de Acceso...');
    let { data: rol, error: rolError } = await supabase
      .from('roles_empresa')
      .select('id, nombre_rol, tipo_empresa, activo')
      .eq('nombre_rol', 'Control de Acceso')
      .maybeSingle();

    if (!rol) {
      console.log('   ⚠️ Rol no existe, creándolo...');
      const { data: nuevoRol, error: createError } = await supabase
        .from('roles_empresa')
        .insert({
          nombre_rol: 'Control de Acceso',
          descripcion: 'Control de ingreso y egreso de vehículos en planta',
          tipo_empresa: 'ambos',
          activo: true
        })
        .select()
        .single();

      if (createError) throw createError;
      rol = nuevoRol;
      console.log('   ✅ Rol creado exitosamente');
    } else {
      console.log(`   ✅ Rol encontrado (${rol.tipo_empresa}, activo: ${rol.activo})`);
    }

    // 2. Obtener primera empresa disponible (o especificar una)
    console.log('\n🏢 Buscando empresas disponibles...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nombre, tipo_empresa')
      .eq('activa', true)
      .limit(5);

    if (empresasError) throw empresasError;

    if (!empresas || empresas.length === 0) {
      console.error('❌ No hay empresas activas en el sistema');
      process.exit(1);
    }

    console.log('   Empresas disponibles:');
    empresas.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.nombre} (${e.tipo_empresa})`);
    });

    // Usar la primera empresa
    const empresaSeleccionada = empresas[0];
    console.log(`\n   ✅ Usando: ${empresaSeleccionada.nombre}`);

    // 3. Datos del usuario
    const usuarioData = {
      email: 'control.acceso@demo.com',
      password: 'ControlAcceso2024!',
      nombre_completo: 'Control de Acceso Demo',
      telefono: '+54 9 11 1234-5678',
      departamento: 'Seguridad - Portería'
    };

    console.log(`\n👤 Creando usuario: ${usuarioData.email}`);

    // 4. Crear usuario en Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: usuarioData.email,
      password: usuarioData.password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: usuarioData.nombre_completo
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('   ⚠️ Usuario ya existe en Auth, obteniendo ID...');
        const { data: existingUsers } = await supabase
          .from('usuarios_empresa')
          .select('user_id')
          .eq('email_interno', usuarioData.email)
          .limit(1);
        
        if (existingUsers && existingUsers.length > 0) {
          console.log('   ✅ Usuario encontrado, ID:', existingUsers[0].user_id);
          console.log('\n📧 Credenciales:');
          console.log(`   Email: ${usuarioData.email}`);
          console.log(`   Password: ${usuarioData.password}`);
          return;
        }
      }
      throw authError;
    }

    console.log(`   ✅ Usuario creado en Auth: ${authUser.user.id}`);

    // 5. Vincular a empresa
    console.log('\n🔗 Vinculando usuario a empresa...');
    const { error: vincularError } = await supabase
      .from('usuarios_empresa')
      .insert({
        user_id: authUser.user.id,
        empresa_id: empresaSeleccionada.id,
        rol_interno: 'Control de Acceso',
        nombre_completo: usuarioData.nombre_completo,
        email_interno: usuarioData.email,
        telefono_interno: usuarioData.telefono,
        departamento: usuarioData.departamento,
        activo: true,
        fecha_vinculacion: new Date().toISOString()
      });

    if (vincularError) throw vincularError;

    console.log('   ✅ Usuario vinculado exitosamente\n');

    console.log('═══════════════════════════════════════════════');
    console.log('✅ USUARIO CREADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════');
    console.log('📧 Email:', usuarioData.email);
    console.log('🔑 Password:', usuarioData.password);
    console.log('🏢 Empresa:', empresaSeleccionada.nombre);
    console.log('👤 Rol: Control de Acceso');
    console.log('═══════════════════════════════════════════════');
    console.log('\n🌐 Acceso: http://localhost:3000/control-acceso');
    console.log('   (Después de iniciar sesión)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

crearUsuarioControlAcceso();

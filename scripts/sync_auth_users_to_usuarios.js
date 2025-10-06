// scripts/sync_auth_users_to_usuarios.js
// Sincronizar usuarios existentes de auth a tabla usuarios

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const usuariosDemo = [
  {
    email: 'admin.demo@nodexia.com',
    nombre_completo: 'Carlos Administrador',
    empresa: 'Transportes Nodexia Demo',
    rol: 'Super Admin'
  },
  {
    email: 'coordinador.demo@tecnoembalajes.com',
    nombre_completo: 'María Coordinadora',
    empresa: 'Tecnoembalajes Demo S.A.',
    rol: 'Coordinador'
  },
  {
    email: 'supervisor.carga@nodexia.com',
    nombre_completo: 'Luis Supervisor',
    empresa: 'Transportes Nodexia Demo',
    rol: 'Supervisor de Carga'
  },
  {
    email: 'control.acceso@nodexia.com',
    nombre_completo: 'Elena Seguridad',
    empresa: 'Transportes Nodexia Demo',
    rol: 'Control de Acceso'
  },
  {
    email: 'chofer.demo@nodexia.com',
    nombre_completo: 'Juan Transportista',
    empresa: 'Transportes Nodexia Demo',
    rol: 'Chofer'
  },
  {
    email: 'operador.demo@logistica.com',
    nombre_completo: 'Ana Operadora',
    empresa: 'Logística del Centro Demo',
    rol: 'Operador'
  },
  {
    email: 'cliente.demo@tecnoembalajes.com',
    nombre_completo: 'Roberto Cliente',
    empresa: 'Tecnoembalajes Demo S.A.',
    rol: 'Cliente'
  }
];

async function sincronizarUsuarios() {
  console.log('🔄 Sincronizando usuarios de auth a tabla usuarios...\n');

  try {
    // Obtener usuarios de auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    // Obtener empresas
    const { data: empresas } = await supabase.from('empresas').select('id, nombre');
    
    // Obtener roles
    const { data: roles } = await supabase.from('roles_empresa').select('id, nombre');

    for (const usuarioDemo of usuariosDemo) {
      console.log(`🔄 Procesando ${usuarioDemo.email}...`);

      // Buscar usuario en auth
      const authUser = authUsers.users.find(u => u.email === usuarioDemo.email);
      if (!authUser) {
        console.log(`   ❌ No encontrado en auth`);
        continue;
      }

      // Verificar si ya existe en tabla usuarios
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', usuarioDemo.email)
        .single();

      if (existingUser) {
        console.log(`   ✅ Ya existe en tabla usuarios`);
        continue;
      }

      // Crear usuario en tabla usuarios
      const { data: nuevoUsuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .insert({
          id: authUser.id,
          email: usuarioDemo.email,
          nombre_completo: usuarioDemo.nombre_completo
        })
        .select()
        .single();

      if (errorUsuario) {
        console.log(`   ❌ Error creando usuario:`, errorUsuario.message);
        continue;
      }

      console.log(`   ✅ Usuario creado en tabla usuarios`);

      // Buscar empresa
      const empresaNombre = usuarioDemo.empresa;
      const empresa = empresas.find(e => e.nombre.includes(empresaNombre.split(' ')[0]) || e.nombre.includes(empresaNombre.split(' ')[1]));
      
      if (!empresa) {
        console.log(`   ⚠️ Empresa no encontrada: ${empresaNombre}`);
        continue;
      }

      // Buscar rol
      const rol = roles.find(r => r.nombre === usuarioDemo.rol);
      if (!rol) {
        console.log(`   ⚠️ Rol no encontrado: ${usuarioDemo.rol}`);
        continue;
      }

      // Crear relación usuario-empresa
      const { error: errorRelacion } = await supabase
        .from('usuarios_empresa')
        .insert({
          user_id: authUser.id,
          empresa_id: empresa.id,
          rol_empresa_id: rol.id,
          rol_interno: usuarioDemo.rol,
          activo: true
        });

      if (errorRelacion) {
        console.log(`   ❌ Error creando relación usuario-empresa:`, errorRelacion.message);
      } else {
        console.log(`   ✅ Relación usuario-empresa creada`);
      }

      console.log(`   📋 ${usuarioDemo.nombre_completo} → ${empresa.nombre} → ${usuarioDemo.rol}\n`);
    }

    console.log('🎉 Sincronización completada!');

    // Verificar usuario Control de Acceso
    console.log('\n🔍 Verificando usuario Control de Acceso...');
    const { data: controlUser } = await supabase
      .from('usuarios')
      .select(`
        email, nombre_completo,
        usuarios_empresa (
          rol_interno,
          empresas (nombre)
        )
      `)
      .eq('email', 'control.acceso@nodexia.com')
      .single();

    if (controlUser) {
      console.log('✅ Usuario Control de Acceso configurado:');
      console.log('   Email:', controlUser.email);
      console.log('   Nombre:', controlUser.nombre_completo);
      console.log('   Rol:', controlUser.usuarios_empresa?.[0]?.rol_interno);
      console.log('   Empresa:', controlUser.usuarios_empresa?.[0]?.empresas?.nombre);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

sincronizarUsuarios();
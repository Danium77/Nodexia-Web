// scripts/verify_control_acceso_user.js
// Verificar configuración del usuario Control de Acceso

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarUsuario() {
  console.log('🔍 Verificando usuario Control de Acceso...\n');

  try {
    // Buscar usuario en auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error obteniendo usuarios auth:', authError.message);
      return;
    }

    const controlUser = authUsers.users.find(u => u.email === 'control.acceso@nodexia.com');
    
    if (!controlUser) {
      console.log('❌ Usuario control.acceso@nodexia.com no encontrado en auth');
      return;
    }

    console.log('✅ Usuario encontrado en auth:', controlUser.id);
    console.log('   Email:', controlUser.email);
    console.log('   Creado:', controlUser.created_at);

    // Buscar en tabla usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select(`
        id, email, nombre_completo,
        usuarios_empresa (
          rol_interno,
          empresa_id,
          empresas (nombre)
        )
      `)
      .eq('email', 'control.acceso@nodexia.com')
      .single();

    if (usuarioError) {
      console.log('❌ Usuario no encontrado en tabla usuarios:', usuarioError.message);
      return;
    }

    console.log('\n✅ Usuario encontrado en tabla usuarios:');
    console.log('   ID:', usuario.id);
    console.log('   Email:', usuario.email);
    console.log('   Nombre:', usuario.nombre_completo);

    if (usuario.usuarios_empresa && usuario.usuarios_empresa.length > 0) {
      const empresaRol = usuario.usuarios_empresa[0];
      console.log('\n✅ Rol asignado:');
      console.log('   Rol:', empresaRol.rol_interno);
      console.log('   Empresa:', empresaRol.empresas?.nombre);
    } else {
      console.log('\n❌ No tiene rol asignado en usuarios_empresa');
    }

    // Verificar mapeo de rol
    const rolInterno = usuario.usuarios_empresa?.[0]?.rol_interno;
    let mappedRole = 'desconocido';
    
    switch (rolInterno) {
      case 'Control de Acceso':
        mappedRole = 'control_acceso';
        break;
      case 'Supervisor de Carga':
        mappedRole = 'supervisor_carga';
        break;
      default:
        mappedRole = 'transporte';
    }

    console.log('\n🔄 Mapeo de rol:');
    console.log('   Rol interno:', rolInterno);
    console.log('   Rol sistema:', mappedRole);

    console.log('\n🎯 RESULTADO:');
    if (rolInterno === 'Control de Acceso') {
      console.log('✅ Usuario Control de Acceso configurado correctamente');
      console.log('   → Debería redirigir a /control-acceso');
    } else {
      console.log('❌ Usuario NO configurado como Control de Acceso');
      console.log('   → Revisar asignación de rol');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

verificarUsuario();
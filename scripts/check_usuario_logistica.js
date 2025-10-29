// Script para verificar usuario logistica@aceiterasanmiguel.com
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsuario() {
  console.log('🔍 Verificando usuario logistica@aceiterasanmiguel.com...\n');
  
  // 1. Buscar en auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error al obtener usuarios auth:', authError);
    return;
  }
  
  const authUser = authUsers.users.find(u => u.email === 'logistica@aceiterasanmiguel.com');
  
  if (!authUser) {
    console.log('❌ Usuario no encontrado en auth.users');
    return;
  }
  
  console.log('✅ Usuario encontrado en auth.users');
  console.log(`   ID: ${authUser.id}`);
  console.log(`   Email: ${authUser.email}`);
  console.log(`   Created: ${authUser.created_at}\n`);
  
  // 2. Buscar en usuarios_empresa
  const { data: usuarioEmpresa, error: ueError } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .eq('user_id', authUser.id)
    .single();
  
  if (ueError) {
    console.error('❌ Error al buscar usuario_empresa:', ueError);
    return;
  }
  
  if (!usuarioEmpresa) {
    console.log('❌ Usuario no encontrado en usuarios_empresa');
    return;
  }
  
  console.log('✅ Usuario encontrado en usuarios_empresa');
  console.log(`   Empresa ID: ${usuarioEmpresa.empresa_id}`);
  console.log(`   Rol: ${usuarioEmpresa.rol}`);
  console.log(`   Activo: ${usuarioEmpresa.activo}\n`);
  
  // 3. Buscar empresa
  const { data: empresa, error: empError } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', usuarioEmpresa.empresa_id)
    .single();
  
  if (empError) {
    console.error('❌ Error al buscar empresa:', empError);
    return;
  }
  
  console.log('✅ Empresa encontrada');
  console.log(`   Nombre: ${empresa.nombre}`);
  console.log(`   CUIT: ${empresa.cuit}`);
  console.log(`   Activa: ${empresa.activo}\n`);
  
  // 4. Verificar vínculos de ubicaciones
  const { data: vinculos, error: vinError } = await supabase
    .from('empresa_ubicaciones')
    .select('*')
    .eq('empresa_id', usuarioEmpresa.empresa_id);
  
  if (vinError) {
    console.error('❌ Error al buscar vínculos:', vinError);
    return;
  }
  
  console.log(`📍 Vínculos de ubicaciones: ${vinculos?.length || 0}`);
  
  if (vinculos && vinculos.length > 0) {
    vinculos.forEach((v, i) => {
      console.log(`   ${i + 1}. Ubicación ID: ${v.ubicacion_id} - Origen: ${v.es_origen} - Destino: ${v.es_destino}`);
    });
  }
  
  // 5. Verificar si puede leer ubicaciones
  console.log('\n🔐 Probando acceso a ubicaciones con este usuario...');
  
  const { data: ubicaciones, error: ubError } = await supabase
    .from('ubicaciones')
    .select('*')
    .eq('activo', true);
  
  if (ubError) {
    console.error('❌ Error al leer ubicaciones:', ubError);
  } else {
    console.log(`✅ Puede leer ${ubicaciones?.length || 0} ubicaciones`);
  }
}

checkUsuario().then(() => process.exit(0));

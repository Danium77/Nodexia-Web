// Script para asignar una empresa al usuario actual
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function asignarEmpresa() {
  console.log('🔍 Buscando usuario y empresas...\n');
  
  // Email del usuario actual
  const userEmail = 'coord_demo@ejemplo.com'; // Cambiar si es necesario
  
  // Buscar usuario
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error listando usuarios:', authError);
    return;
  }
  
  const user = users.find(u => u.email === userEmail);
  if (!user) {
    console.log(`❌ Usuario ${userEmail} no encontrado`);
    console.log('Usuarios disponibles:');
    users.forEach(u => console.log(`  - ${u.email}`));
    return;
  }
  
  console.log(`✅ Usuario encontrado: ${user.email} (${user.id})`);
  
  // Buscar empresas
  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa')
    .limit(5);
  
  if (empresasError) {
    console.error('❌ Error buscando empresas:', empresasError);
    return;
  }
  
  if (!empresas || empresas.length === 0) {
    console.log('⚠️ No hay empresas en la base de datos');
    return;
  }
  
  console.log('\n📊 Empresas disponibles:');
  empresas.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.nombre} (${e.tipo_empresa}) - ID: ${e.id}`);
  });
  
  // Asignar la primera empresa tipo 'planta'
  const empresaPlanta = empresas.find(e => e.tipo_empresa === 'planta');
  if (!empresaPlanta) {
    console.log('\n⚠️ No hay empresas tipo "planta"');
    return;
  }
  
  console.log(`\n🔗 Asignando empresa "${empresaPlanta.nombre}" al usuario...`);
  
  // Verificar si ya existe la asignación
  const { data: existente } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .eq('user_id', user.id)
    .eq('empresa_id', empresaPlanta.id)
    .single();
  
  if (existente) {
    console.log('✅ El usuario ya está asignado a esta empresa');
    return;
  }
  
  // Crear la asignación
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .insert({
      user_id: user.id,
      empresa_id: empresaPlanta.id
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error asignando empresa:', error);
    return;
  }
  
  console.log('✅ Empresa asignada exitosamente');
  console.log(JSON.stringify(data, null, 2));
}

asignarEmpresa().then(() => process.exit(0));

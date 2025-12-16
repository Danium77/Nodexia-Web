require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRol() {
  console.log('🔍 Verificando roles para "Control de Acceso"...\n');
  
  // 1. Verificar empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa')
    .eq('id', '3cc1979e-1672-48b8-a5e5-2675f5cac527')
    .single();
    
  console.log('🏢 Empresa:', empresa);
  
  // 2. Buscar roles disponibles
  console.log('\n📋 Buscando rol "Control de Acceso" para tipo:', empresa.tipo_empresa);
  
  const { data: roles, error } = await supabase
    .from('roles_empresa')
    .select('*')
    .eq('nombre_rol', 'Control de Acceso')
    .in('tipo_empresa', [empresa.tipo_empresa, 'ambos'])
    .eq('activo', true);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\n✅ Roles encontrados: ${roles?.length || 0}`);
  if (roles && roles.length > 0) {
    roles.forEach((rol, i) => {
      console.log(`\n${i + 1}. ${rol.nombre_rol}`);
      console.log(`   ID: ${rol.id}`);
      console.log(`   Tipo: ${rol.tipo_empresa}`);
      console.log(`   Activo: ${rol.activo}`);
    });
  } else {
    console.log('⚠️  No se encontró el rol');
    
    // Listar todos los roles disponibles
    console.log('\n📋 Todos los roles disponibles:');
    const { data: todosRoles } = await supabase
      .from('roles_empresa')
      .select('nombre_rol, tipo_empresa, activo')
      .eq('activo', true);
      
    todosRoles?.forEach(r => {
      console.log(`  - ${r.nombre_rol} (${r.tipo_empresa})`);
    });
  }
}

checkRol().catch(console.error);

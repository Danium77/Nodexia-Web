const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRoles() {
  console.log('🔍 Verificando roles disponibles...\n');

  // Ver todos los roles
  const { data: allRoles, error } = await supabaseAdmin
    .from('roles_empresa')
    .select('*')
    .order('tipo_empresa, nombre_rol');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📋 TODOS LOS ROLES EN EL SISTEMA:\n');
  allRoles.forEach(rol => {
    console.log(`  ${rol.activo ? '✅' : '❌'} [${rol.tipo_empresa}] ${rol.nombre_rol} (${rol.id})`);
    if (rol.descripcion) console.log(`     "${rol.descripcion}"`);
  });

  // Filtrar por transporte
  const transporteRoles = allRoles.filter(r => r.tipo_empresa === 'transporte' || r.tipo_empresa === 'ambos');
  
  console.log('\n🚛 ROLES DISPONIBLES PARA EMPRESAS DE TRANSPORTE:\n');
  if (transporteRoles.length === 0) {
    console.log('  ⚠️ NO HAY ROLES CONFIGURADOS PARA TRANSPORTE');
  } else {
    transporteRoles.forEach(rol => {
      console.log(`  ${rol.activo ? '✅' : '❌'} ${rol.nombre_rol}`);
    });
  }

  console.log('\n📝 ROLES ESPERADOS SEGÚN types.ts:\n');
  console.log('  ✅ coordinador_transporte');
  console.log('  ✅ chofer');
  console.log('  ✅ administrativo');
}

checkRoles();

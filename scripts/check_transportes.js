// Script para verificar empresas transportistas disponibles
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTransportes() {
  console.log('🔍 Consultando empresas transportistas...\n');
  
  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('id, nombre, cuit, tipo_empresa, activo')
    .eq('tipo_empresa', 'transporte')
    .order('nombre', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Total empresas transportistas: ${empresas?.length || 0}\n`);
  
  if (empresas && empresas.length > 0) {
    empresas.forEach((emp, i) => {
      console.log(`${i + 1}. ${emp.nombre}`);
      console.log(`   CUIT: ${emp.cuit}`);
      console.log(`   ID: ${emp.id}`);
      console.log(`   Activo: ${emp.activo ? 'Sí' : 'No'}\n`);
    });
  } else {
    console.log('⚠️ No hay empresas transportistas en la base de datos');
    console.log('💡 Sugerencia: Crear empresas transportistas desde /admin/empresas como super_admin');
  }
}

checkTransportes().then(() => process.exit(0));

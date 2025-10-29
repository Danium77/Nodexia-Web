require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('📋 Listando todas las empresas:\n');
  
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa, cuit')
    .order('nombre');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total empresas: ${data.length}\n`);
  data.forEach((e, i) => {
    console.log(`${i + 1}. ${e.nombre}`);
    console.log(`   ID: ${e.id}`);
    console.log(`   Tipo: ${e.tipo_empresa}`);
    console.log(`   CUIT: ${e.cuit || 'N/A'}`);
    console.log('');
  });
}

main();

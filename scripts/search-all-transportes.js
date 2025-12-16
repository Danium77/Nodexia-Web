const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchAllTransportes() {
  console.log('🔍 Buscando TODAS las empresas de transporte...\n');

  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('tipo_empresa', 'transporte')
    .order('nombre');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📦 Total transportes: ${empresas?.length || 0}\n`);

  if (empresas) {
    empresas.forEach((e, index) => {
      console.log(`${index + 1}. ${e.nombre}`);
      console.log(`   ID: ${e.id}`);
      console.log(`   Tipo: ${e.tipo_empresa}`);
      console.log('');
    });
  }

  // Buscar el UUID incorrecto que está usando el frontend
  const uuidBuscado = '30b2f467-22df-46e3-9238-4293c7ec9fd1';
  console.log(`\n🔎 Buscando UUID similar a: ${uuidBuscado}`);
  
  empresas?.forEach(e => {
    let differences = 0;
    for (let i = 0; i < e.id.length; i++) {
      if (e.id[i] !== uuidBuscado[i]) differences++;
    }
    if (differences <= 5) {
      console.log(`\n✨ Posible match: ${e.nombre}`);
      console.log(`   UUID BD:       ${e.id}`);
      console.log(`   UUID buscado:  ${uuidBuscado}`);
      console.log(`   Diferencias:   ${differences} caracteres`);
    }
  });
}

searchAllTransportes().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyDemo() {
  console.log('📊 Verificando datos demo creados...\n');
  
  const { data: despachos } = await supabase
    .from('despachos')
    .select('pedido_id, estado, origen, destino')
    .ilike('pedido_id', 'DEMO_%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('📦 DESPACHOS DEMO (últimos 10):');
  despachos?.forEach(d => {
    console.log(`   ${d.pedido_id}: ${d.estado} | ${d.origen} → ${d.destino}`);
  });
  
  const { data: transportes } = await supabase
    .from('transportes')
    .select('nombre, contacto')
    .ilike('nombre', 'DEMO_%');
    
  console.log('\n🚛 TRANSPORTES DEMO:');
  transportes?.forEach(t => {
    console.log(`   ${t.nombre}`);
  });
  
  // Contar por estados
  const { data: estadosCount } = await supabase
    .from('despachos')
    .select('estado')
    .ilike('pedido_id', 'DEMO_%');
    
  const conteo = {};
  estadosCount?.forEach(d => {
    conteo[d.estado] = (conteo[d.estado] || 0) + 1;
  });
  
  console.log('\n📈 DISTRIBUCIÓN DE ESTADOS:');
  Object.entries(conteo).forEach(([estado, count]) => {
    console.log(`   ${estado}: ${count} despachos`);
  });
}

verifyDemo().catch(console.error);
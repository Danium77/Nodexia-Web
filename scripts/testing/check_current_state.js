const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentState() {
  console.log('=== ESTADO ACTUAL ===');
  
  // Transportes
  const { data: transportes } = await supabase.from('transportes').select('*');
  console.log('Transportes totales:', transportes?.length || 0);
  transportes?.forEach(t => console.log(`- ${t.nombre} (ID: ${t.id})`));
  
  // Despachos con estado
  const { data: despachos } = await supabase
    .from('despachos')
    .select('pedido_id, estado, transport_id, created_by')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\nÚltimos 10 despachos:');
  despachos?.forEach((d, i) => {
    const hasTransport = d.transport_id ? '🚛' : '❌';
    console.log(`${i+1}. ${d.pedido_id} | ${d.estado} | ${hasTransport}`);
  });
  
  // Específicamente los despachos pendientes
  const { data: pendientes } = await supabase
    .from('despachos')
    .select('*')
    .eq('estado', 'pendiente_transporte')
    .eq('created_by', '74d71b4a-81db-459d-93f6-b52e82c3e4bc');
    
  console.log('\nDespachos pendientes del usuario:', pendientes?.length || 0);
}

checkCurrentState().catch(console.error);
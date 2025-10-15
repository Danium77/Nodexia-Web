const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNewDispatch() {
  console.log('=== VERIFICANDO DESPACHO DSP-20251011-001 ===');
  const { data, error } = await supabase
    .from('despachos')
    .select('*')
    .eq('pedido_id', 'DSP-20251011-001')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Despachos encontrados:', data.length);
    data.forEach((d, i) => {
      console.log(`${i+1}. DESPACHO:`);
      console.log(`   - ID: ${d.pedido_id}`);
      console.log(`   - Estado: ${d.estado}`);
      console.log(`   - Created by: ${d.created_by}`);
      console.log(`   - Transport ID: ${d.transport_id || 'NULL'}`);
      console.log(`   - Creado: ${d.created_at}`);
    });
  }

  // También verificar el usuario actual
  console.log('\n=== USUARIO ACTUAL ===');
  const userId = '74d71b4a-81db-459d-93f6-b52e82c3e4bc';
  console.log('Usuario esperado:', userId);
  
  if (data && data.length > 0) {
    const match = data[0].created_by === userId;
    console.log('Match con usuario actual:', match ? '✅' : '❌');
    if (!match) {
      console.log('❌ PROBLEMA: El despacho no pertenece al usuario actual');
    }
  }
}

checkNewDispatch().catch(console.error);
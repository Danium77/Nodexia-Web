const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllDispatches() {
  console.log('=== VERIFICANDO TODOS LOS DESPACHOS DEL COORDINADOR ===');
  
  try {
    const userId = '07df7dc0-f24f-4b39-9abf-82930154a94c';
    
    const { data, error } = await supabase
      .from('despachos')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📦 Total despachos encontrados: ${data.length}`);
    console.log('\n=== LISTA COMPLETA ===');
    
    data.forEach((d, i) => {
      console.log(`${i+1}. ${d.pedido_id || 'SIN_ID'}`);
      console.log(`   Estado: ${d.estado}`);
      console.log(`   Transport ID: ${d.transport_id || 'null'}`);
      console.log(`   Origen: ${d.origen}`);
      console.log(`   Destino: ${d.destino}`);
      console.log(`   Creado: ${d.created_at}`);
      console.log('   ---');
    });

    // Verificar si hay discrepancia con lo que muestra la interfaz
    const visibleInUI = ['PED-1758140267844', 'PED-1758140210477'];
    console.log('\n=== VERIFICANDO DESPACHOS VISIBLES EN UI ===');
    
    visibleInUI.forEach(pedidoId => {
      const dispatch = data.find(d => d.pedido_id === pedidoId);
      if (dispatch) {
        console.log(`✅ ${pedidoId}: Estado=${dispatch.estado}, Transport=${dispatch.transport_id || 'null'}`);
      } else {
        console.log(`❌ ${pedidoId}: NO ENCONTRADO en BD`);
      }
    });

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkAllDispatches();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCoordinatorDispatches() {
  console.log('=== VERIFICANDO DESPACHOS DEL COORDINADOR ===');
  
  try {
    // Usuario que aparece en la imagen: coordinador.demo@tecnoembalajes.com
    const userId = '07df7dc0-f24f-4b39-9abf-82930154a94c';
    
    // Buscar despachos de este usuario específico
    const { data: dispatches, error } = await supabase
      .from('despachos')
      .select(`
        id,
        pedido_id,
        origen,
        destino,
        estado,
        scheduled_local_date,
        scheduled_local_time,
        type,
        prioridad,
        unidad_type,
        comentarios,
        transport_id,
        created_at
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al buscar despachos:', error);
      return;
    }

    console.log(`📦 Despachos encontrados: ${dispatches.length}`);
    
    if (dispatches.length > 0) {
      console.log('\n=== DESPACHOS DEL COORDINADOR ===');
      dispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. Pedido ID: "${dispatch.pedido_id || 'VACÍO'}"`);
        console.log(`   Origen: ${dispatch.origen}`);
        console.log(`   Destino: ${dispatch.destino}`);
        console.log(`   Estado: ${dispatch.estado}`);
        console.log(`   Fecha programa: ${dispatch.scheduled_local_date}`);
        console.log(`   Hora programa: ${dispatch.scheduled_local_time}`);
        console.log(`   Tipo: ${dispatch.type}`);
        console.log(`   Prioridad: ${dispatch.prioridad}`);
        console.log(`   Unidad: ${dispatch.unidad_type}`);
        console.log(`   Transporte ID: ${dispatch.transport_id || 'Sin asignar'}`);
        console.log(`   Creado: ${dispatch.created_at}`);
        console.log('   ---');
      });

      // Verificar por qué el despacho con pedido_id vacío no aparece en la lista
      const emptyIdDispatch = dispatches.find(d => !d.pedido_id || d.pedido_id.trim() === '');
      if (emptyIdDispatch) {
        console.log('\n⚠️ PROBLEMA ENCONTRADO:');
        console.log('Hay un despacho con pedido_id vacío:', emptyIdDispatch.id);
        console.log('Este despacho no aparecerá correctamente en la interfaz.');
      }
      
    } else {
      console.log('📭 No hay despachos para este coordinador');
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkCoordinatorDispatches();
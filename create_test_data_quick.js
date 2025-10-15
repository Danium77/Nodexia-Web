// Crear despachos rápidos para testing
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestData() {
  console.log('🚀 Creando datos de prueba...');
  
  try {
    // 1. Crear transporte si no existe
    const transporteId = '3ef28c80-155b-440e-97fe-f6c10d81270b';
    
    const { data: transporteExiste } = await supabase
      .from('transportes')
      .select('id')
      .eq('id', transporteId)
      .single();
    
    if (!transporteExiste) {
      console.log('📦 Creando transporte...');
      await supabase.from('transportes').insert({
        id: transporteId,
        nombre: 'Transporte Bs As',
        tipo: 'Semi-remolque',
        capacidad: '25 toneladas',
        disponible: true
      });
      console.log('✅ Transporte creado');
    }
    
    // 2. Crear algunos despachos para probar (con la estructura correcta)
    const despachos = [
      {
        pedido_id: 'PROD-001',
        origen: 'Buenos Aires',
        destino: 'Córdoba',
        scheduled_local_date: '2024-11-15',
        scheduled_local_time: '10:00:00',
        type: 'Electrónicos',
        prioridad: 'Alta',
        unidad_type: 'Camión',
        estado: 'pendiente_transporte',
        created_by: '44095810-df1c-44b9-b9ab-0489613f125a'
      },
      {
        pedido_id: 'PROD-002',
        origen: 'Rosario',
        destino: 'Mendoza',
        scheduled_local_date: '2024-11-16',
        scheduled_local_time: '14:00:00',
        type: 'Alimentos',
        prioridad: 'Normal',
        unidad_type: 'Semi-remolque',
        estado: 'pendiente_transporte',
        created_by: '44095810-df1c-44b9-b9ab-0489613f125a'
      }
    ];
    
    console.log('📦 Creando despachos...');
    for (const despacho of despachos) {
      // Verificar si ya existe
      const { data: existeDespacho, error: checkError } = await supabase
        .from('despachos')
        .select('pedido_id')
        .eq('pedido_id', despacho.pedido_id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.log('Error checking:', checkError);
      }
        
      if (!existeDespacho) {
        const { data: nuevoDespacho, error: insertError } = await supabase
          .from('despachos')
          .insert(despacho)
          .select();
          
        if (insertError) {
          console.error(`❌ Error creando ${despacho.pedido_id}:`, insertError);
        } else {
          console.log(`✅ Despacho ${despacho.pedido_id} creado`);
        }
      } else {
        console.log(`⚠️ Despacho ${despacho.pedido_id} ya existe`);
      }
    }
    
    console.log('\n🎯 DATOS DE PRUEBA LISTOS!');
    return true;
    
  } catch (error) {
    console.error('💥 Error:', error);
    return false;
  }
}

createTestData().then(() => {
  console.log('🎯 Ahora ejecuta: node test_modal_assign.js');
  process.exit(0);
});
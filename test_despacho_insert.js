const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDespachoInsert() {
  console.log('=== PROBANDO INSERCIÓN COMPLETA DE DESPACHO ===');
  
  try {
    // Simular los datos que el usuario está enviando desde el formulario
    const testData = {
      created_by: '74d71b4a-81db-459d-93f6-b52e82c3e4bc', // Usuario de ejemplo existente
      origen: 'Planta Central', 
      destino: 'Cliente Norte',
      estado: 'Generado',
      scheduled_at: new Date().toISOString(),
      pedido_id: 'DSP-20241217-999',
      type: 'despacho',
      comentarios: 'Prueba de inserción completa',
      prioridad: 'Normal',
      unidad_type: 'semi',
      scheduled_local_date: new Date().toISOString().split('T')[0],
      scheduled_local_time: '10:00:00'
    };

    console.log('Datos a insertar:', testData);
    
    // Intentar la inserción
    const { data: insertResult, error: insertError } = await supabase
      .from('despachos')
      .insert(testData)
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Error en inserción:', insertError);
      console.error('Mensaje:', insertError.message);
      console.error('Detalles:', insertError.details);
      console.error('Código:', insertError.code);
      console.error('Hint:', insertError.hint);
    } else {
      console.log('✅ Inserción exitosa!');
      console.log('Resultado:', insertResult);
      
      // Limpiar el registro de prueba
      const { error: deleteError } = await supabase
        .from('despachos')
        .delete()
        .eq('id', insertResult.id);
        
      if (!deleteError) {
        console.log('🧹 Registro de prueba eliminado');
      }
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testDespachoInsert();
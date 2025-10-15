// Script para probar el modal de asignación de transporte
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testModalFunctionality() {
  console.log('🧪 TESTING MODAL DE ASIGNACIÓN');
  console.log('===============================');
  
  try {
    // 1. Verificar que existe al menos un despacho
    const { data: despachos, error: despachosError } = await supabase
      .from('despachos')
      .select('*')
      .limit(1);
      
    if (despachosError) throw despachosError;
    
    if (despachos.length === 0) {
      console.log('❌ No hay despachos para probar');
      return false;
    }
    
    console.log('✅ Despacho encontrado:', despachos[0].pedido_id);
    
    // 2. Verificar que existe el transporte conocido
    const transporteId = '3ef28c80-155b-440e-97fe-f6c10d81270b';
    const { data: transporte, error: transporteError } = await supabase
      .from('transportes')
      .select('*')
      .eq('id', transporteId)
      .single();
      
    if (transporteError) {
      console.log('⚠️ Transporte no encontrado, creándolo...');
      
      const { data: nuevoTransporte, error: createError } = await supabase
        .from('transportes')
        .insert({
          id: transporteId,
          nombre: 'Transporte Bs As',
          tipo: 'Semi-remolque',
          capacidad: '25 toneladas',
          disponible: true
        })
        .select()
        .single();
        
      if (createError) throw createError;
      console.log('✅ Transporte creado:', nuevoTransporte.nombre);
    } else {
      console.log('✅ Transporte encontrado:', transporte.nombre);
    }
    
    // 3. Simular asignación como lo haría el modal
    const despacho = despachos[0];
    const updateData = {
      transport_id: transporteId,
      estado: 'transporte_asignado',
      comentarios: `${despacho.pedido_id} - Test asignación automatizada`
    };
    
    console.log('🔄 Simulando asignación...');
    console.log('Datos a actualizar:', updateData);
    
    const { data: resultado, error: updateError } = await supabase
      .from('despachos')
      .update(updateData)
      .eq('id', despacho.id)
      .select('*');
      
    if (updateError) throw updateError;
    
    console.log('✅ ASIGNACIÓN EXITOSA!');
    console.log('📊 Resultado:', {
      despacho_id: resultado[0].id,
      pedido_id: resultado[0].pedido_id,
      transport_id: resultado[0].transport_id,
      estado: resultado[0].estado,
      comentarios: resultado[0].comentarios
    });
    
    // 4. Verificar el estado final
    const { data: verificacion, error: verifError } = await supabase
      .from('despachos')
      .select('*, transportes(nombre)')
      .eq('id', despacho.id)
      .single();
      
    if (verifError) throw verifError;
    
    console.log('🎯 VERIFICACIÓN FINAL:');
    console.log(`   Despacho: ${verificacion.pedido_id}`);
    console.log(`   Estado: ${verificacion.estado}`);
    console.log(`   Transporte: ${verificacion.transportes?.nombre || 'N/A'}`);
    console.log(`   Comentarios: ${verificacion.comentarios}`);
    
    console.log('\n✅ MODAL TEST EXITOSO - El backend funciona perfectamente!');
    console.log('🎯 Ahora el problema debe ser solo UI/frontend');
    
    return true;
    
  } catch (error) {
    console.error('💥 ERROR en test:', error);
    return false;
  }
}

// Ejecutar test
testModalFunctionality()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🚀 BACKEND MODAL: FUNCIONANDO ✅');
      console.log('📝 PRÓXIMO PASO: Probar en navegador');
    } else {
      console.log('❌ BACKEND MODAL: CON ERRORES');
      console.log('🔧 NECESITA REPARACIÓN');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateExistingDispatches() {
  console.log('=== ACTUALIZANDO DESPACHOS EXISTENTES ===');
  
  // Encontrar despachos con estado 'Generado' del usuario actual
  const userId = '74d71b4a-81db-459d-93f6-b52e82c3e4bc';
  
  const { data: toUpdate, error: findError } = await supabase
    .from('despachos')
    .select('id, pedido_id, estado')
    .eq('created_by', userId)
    .eq('estado', 'Generado')
    .is('transport_id', null); // Solo los que no tienen transporte asignado
  
  if (findError) {
    console.error('Error buscando despachos:', findError);
    return;
  }
  
  console.log('Despachos para actualizar:', toUpdate.length);
  toUpdate.forEach((d, i) => {
    console.log(`${i+1}. ${d.pedido_id} - Estado: ${d.estado}`);
  });
  
  if (toUpdate.length > 0) {
    // Actualizar todos a pendiente_transporte
    const { data: updated, error: updateError } = await supabase
      .from('despachos')
      .update({ estado: 'pendiente_transporte' })
      .eq('created_by', userId)
      .eq('estado', 'Generado')
      .is('transport_id', null)
      .select();
    
    if (updateError) {
      console.error('Error actualizando despachos:', updateError);
    } else {
      console.log('✅ Despachos actualizados exitosamente:', updated.length);
      updated.forEach((d, i) => {
        console.log(`${i+1}. ${d.pedido_id} - Nuevo estado: ${d.estado}`);
      });
    }
  } else {
    console.log('No hay despachos para actualizar');
  }
}

updateExistingDispatches().catch(console.error);
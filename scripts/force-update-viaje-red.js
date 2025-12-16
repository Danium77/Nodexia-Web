const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceUpdate() {
  const viajeRedId = '8c695f53-fb8c-4eab-8db2-4d47f2b07675';
  const ofertaId = '403d2219-c780-4812-8ede-41c10dec53b4';
  const transporteId = '30b2f467-22df-46e3-9230-4293c7ec9fd1'; // ✅ UUID CORRECTO

  console.log('🔧 Forzando UPDATE de viaje en Red Nodexia...');
  console.log('📋 Parámetros:');
  console.log('   viaje_red_id:', viajeRedId);
  console.log('   oferta_id:', ofertaId);
  console.log('   transporte_id:', transporteId);
  console.log('');

  // 1. Actualizar oferta
  console.log('1️⃣ Actualizando oferta...');
  const { error: ofertaError } = await supabase
    .from('ofertas_red_nodexia')
    .update({
      estado_oferta: 'aceptada',
      fecha_respuesta: new Date().toISOString()
    })
    .eq('id', ofertaId);

  if (ofertaError) {
    console.error('❌ Error actualizando oferta:', ofertaError);
  } else {
    console.log('✅ Oferta actualizada');
  }

  // 2. Actualizar viaje en red
  console.log('\n2️⃣ Actualizando viajes_red_nodexia...');
  const { data: updateData, error: updateError } = await supabase
    .from('viajes_red_nodexia')
    .update({
      estado_red: 'asignado',
      transporte_asignado_id: transporteId,
      oferta_aceptada_id: ofertaId,
      fecha_asignacion: new Date().toISOString()
    })
    .eq('id', viajeRedId)
    .select();

  if (updateError) {
    console.error('❌ Error actualizando viaje:', updateError);
  } else {
    console.log('✅ UPDATE ejecutado');
    console.log('📊 Rows affected:', updateData?.length || 0);
    console.log('📦 Data:', JSON.stringify(updateData, null, 2));
  }

  // 3. Verificar
  console.log('\n3️⃣ Verificando cambios...');
  const { data: verif } = await supabase
    .from('viajes_red_nodexia')
    .select('*')
    .eq('id', viajeRedId)
    .single();

  console.log('📋 Estado actual:', {
    estado_red: verif?.estado_red,
    transporte_asignado_id: verif?.transporte_asignado_id,
    oferta_aceptada_id: verif?.oferta_aceptada_id
  });
}

forceUpdate().catch(console.error);

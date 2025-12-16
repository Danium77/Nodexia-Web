const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllViajesRed() {
  console.log('🔍 Verificando TODOS los viajes en Red Nodexia...\n');

  const { data: viajes, error } = await supabase
    .from('viajes_red_nodexia')
    .select('*')
    .order('fecha_publicacion', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📦 Total viajes en Red Nodexia (últimos 10): ${viajes?.length || 0}\n`);

  if (!viajes || viajes.length === 0) {
    console.log('⚠️ No hay viajes en Red Nodexia');
    return;
  }

  for (const viaje of viajes) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 ID: ${viaje.id}`);
    console.log(`   Viaje Despacho ID: ${viaje.viaje_id}`);
    console.log(`   ⭐ ESTADO_RED: ${viaje.estado_red}`);
    console.log(`   Transporte Asignado: ${viaje.transporte_asignado_id || 'NULL'}`);
    console.log(`   Oferta Aceptada: ${viaje.oferta_aceptada_id || 'NULL'}`);
    console.log(`   Fecha Publicación: ${viaje.fecha_publicacion}`);
    console.log(`   Fecha Asignación: ${viaje.fecha_asignacion || 'NULL'}`);
    
    // Buscar ofertas para este viaje
    const { data: ofertas } = await supabase
      .from('ofertas_red_nodexia')
      .select('id, transporte_id, estado_oferta, fecha_oferta, fecha_respuesta')
      .eq('viaje_red_id', viaje.id);
    
    if (ofertas && ofertas.length > 0) {
      console.log(`   💼 Ofertas (${ofertas.length}):`);
      for (const oferta of ofertas) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nombre')
          .eq('id', oferta.transporte_id)
          .single();
        
        console.log(`      - ${empresa?.nombre}: ${oferta.estado_oferta} (ID: ${oferta.id})`);
      }
    }
    console.log('');
  }
}

checkAllViajesRed().catch(console.error);

// Buscar viajes en viajes_red_nodexia con estado asignado
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Buscando viajes asignados en viajes_red_nodexia...\n');

  const { data: viajesAsignados, error } = await supabase
    .from('viajes_red_nodexia')
    .select('*')
    .eq('estado_red', 'asignado');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📦 Viajes con estado_red='asignado': ${viajesAsignados?.length || 0}\n`);

  if (viajesAsignados && viajesAsignados.length > 0) {
    for (const viaje of viajesAsignados) {
      console.log('━'.repeat(80));
      console.log(`Viaje Red ID: ${viaje.id}`);
      console.log(`Viaje Despacho ID: ${viaje.viaje_id}`);
      console.log(`Estado Red: ${viaje.estado_red}`);
      console.log(`Transporte Asignado ID: ${viaje.transporte_asignado_id}`);
      console.log(`Oferta Aceptada ID: ${viaje.oferta_aceptada_id}`);
      console.log(`Fecha Asignación: ${viaje.fecha_asignacion}`);
      
      // Buscar el nombre del transporte
      if (viaje.transporte_asignado_id) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nombre, tipo_empresa')
          .eq('id', viaje.transporte_asignado_id)
          .single();
        
        if (empresa) {
          console.log(`Transporte: ${empresa.nombre} (${empresa.tipo_empresa})`);
        } else {
          console.log(`⚠️ NO SE ENCONTRÓ EMPRESA con ID: ${viaje.transporte_asignado_id}`);
        }
      }
    }
    console.log('━'.repeat(80));
  }

  // También buscar el viaje específico que estamos rastreando
  console.log('\n🔍 Buscando viaje específico (3819790d-79ad-4a05-9565-eef6e8092a24)...');
  const { data: viajeEspecifico } = await supabase
    .from('viajes_red_nodexia')
    .select('*')
    .eq('id', '3819790d-79ad-4a05-9565-eef6e8092a24')
    .single();

  if (viajeEspecifico) {
    console.log('\n✅ Viaje encontrado:');
    console.log(JSON.stringify(viajeEspecifico, null, 2));
  } else {
    console.log('\n❌ Viaje NO encontrado con ese ID');
  }
}

main()
  .then(() => {
    console.log('\n✅ Búsqueda completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

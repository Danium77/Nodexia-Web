const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkViajesAsignados() {
  console.log('🔍 Verificando viajes con estado_red = asignado...\n');

  // 1. Buscar todos los viajes asignados
  const { data: viajesAsignados, error } = await supabase
    .from('viajes_red_nodexia')
    .select('*')
    .eq('estado_red', 'asignado');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📦 Total viajes con estado_red='asignado': ${viajesAsignados?.length || 0}\n`);

  if (!viajesAsignados || viajesAsignados.length === 0) {
    console.log('⚠️ No hay viajes asignados en la BD');
    return;
  }

  // Mostrar cada viaje
  for (const viaje of viajesAsignados) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Viaje Red ID: ${viaje.id}`);
    console.log(`   Viaje Despacho ID: ${viaje.viaje_id}`);
    console.log(`   Estado: ${viaje.estado_red}`);
    console.log(`   Transporte Asignado ID: ${viaje.transporte_asignado_id}`);
    console.log(`   Oferta Aceptada ID: ${viaje.oferta_aceptada_id}`);
    console.log(`   Fecha Asignación: ${viaje.fecha_asignacion}`);
    console.log(`   Empresa Solicitante ID: ${viaje.empresa_solicitante_id}`);
    
    // Buscar nombre de empresa transporte
    if (viaje.transporte_asignado_id) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nombre')
        .eq('id', viaje.transporte_asignado_id)
        .single();
      
      console.log(`   ✅ Empresa Transporte: ${empresa?.nombre || 'NO ENCONTRADA'}`);
    }
    console.log('');
  }

  // 2. Buscar Logística del Centro Demo
  console.log('\n🔎 Buscando empresa "Logística del Centro Demo"...');
  const { data: empresas } = await supabase
    .from('empresas')
    .select('*')
    .ilike('nombre', '%logistica%centro%');

  if (empresas && empresas.length > 0) {
    console.log('\n📋 Empresas encontradas:');
    empresas.forEach(e => {
      console.log(`   ID: ${e.id}`);
      console.log(`   Nombre: ${e.nombre}`);
      console.log(`   Tipo: ${e.tipo_empresa}`);
      console.log('');
    });

    // Verificar si alguno de estos IDs está en transporte_asignado_id
    const empresaIds = empresas.map(e => e.id);
    const match = viajesAsignados.find(v => empresaIds.includes(v.transporte_asignado_id));
    
    if (match) {
      console.log('✅ MATCH ENCONTRADO entre viajes asignados y empresa Logística Centro Demo');
    } else {
      console.log('❌ NO HAY MATCH - El UUID guardado en transporte_asignado_id NO coincide con Logística del Centro Demo');
      console.log(`\n🔍 UUIDs guardados en viajes: ${viajesAsignados.map(v => v.transporte_asignado_id).join(', ')}`);
      console.log(`🔍 UUID de Logística Centro: ${empresaIds.join(', ')}`);
    }
  }
}

checkViajesAsignados().catch(console.error);

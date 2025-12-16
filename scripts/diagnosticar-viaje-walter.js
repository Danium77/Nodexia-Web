// Script para diagnosticar por qué Walter no ve el viaje asignado
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WALTER_USER_ID = '50da5768-b203-4719-ad16-62e03e2b151a';

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO DE VIAJE ASIGNADO A WALTER\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // 1. Verificar el chofer
    console.log('1️⃣ VERIFICANDO CHOFER WALTER...');
    const { data: chofer, error: errorChofer } = await supabase
      .from('choferes')
      .select('*')
      .eq('user_id', WALTER_USER_ID)
      .single();

    if (errorChofer) {
      console.error('❌ Error obteniendo chofer:', errorChofer);
      return;
    }

    console.log('✅ Chofer encontrado:');
    console.log('   ID:', chofer.id);
    console.log('   Nombre:', chofer.nombre, chofer.apellido);
    console.log('   User ID:', chofer.user_id);
    console.log('   Empresa:', chofer.id_transporte);
    console.log('');

    // 2. Buscar viajes asignados a este chofer
    console.log('2️⃣ BUSCANDO VIAJES ASIGNADOS...');
    const { data: viajes, error: errorViajes } = await supabase
      .from('viajes_despacho')
      .select(`
        id,
        numero_viaje,
        despacho_id,
        chofer_id,
        id_chofer,
        camion_id,
        id_camion,
        estado,
        estado_unidad,
        observaciones,
        created_at
      `)
      .or(`chofer_id.eq.${chofer.id},id_chofer.eq.${chofer.id}`)
      .order('created_at', { ascending: false });

    if (errorViajes) {
      console.error('❌ Error obteniendo viajes:', errorViajes);
      return;
    }

    console.log(`📋 Total de viajes encontrados: ${viajes?.length || 0}\n`);

    if (!viajes || viajes.length === 0) {
      console.log('⚠️  NO SE ENCONTRARON VIAJES ASIGNADOS A WALTER');
      console.log('');
      console.log('Verificando últimos viajes creados...');
      
      const { data: ultimosViajes } = await supabase
        .from('viajes_despacho')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('\n📊 Últimos 5 viajes en el sistema:');
      ultimosViajes?.forEach((v, i) => {
        console.log(`\n${i + 1}. Viaje: ${v.numero_viaje}`);
        console.log(`   chofer_id: ${v.chofer_id || 'NULL'}`);
        console.log(`   id_chofer: ${v.id_chofer || 'NULL'}`);
        console.log(`   camion_id: ${v.camion_id || 'NULL'}`);
        console.log(`   id_camion: ${v.id_camion || 'NULL'}`);
        console.log(`   estado: ${v.estado}`);
        console.log(`   estado_unidad: ${v.estado_unidad || 'NULL'}`);
      });

      return;
    }

    // 3. Mostrar detalles de cada viaje
    for (const viaje of viajes) {
      console.log('─────────────────────────────────────────');
      console.log('📦 VIAJE:', viaje.numero_viaje);
      console.log('─────────────────────────────────────────');
      console.log('ID:', viaje.id);
      console.log('Despacho ID:', viaje.despacho_id);
      console.log('chofer_id:', viaje.chofer_id);
      console.log('id_chofer:', viaje.id_chofer);
      console.log('camion_id:', viaje.camion_id);
      console.log('id_camion:', viaje.id_camion);
      console.log('Estado:', viaje.estado);
      console.log('Estado Unidad:', viaje.estado_unidad);
      console.log('Creado:', viaje.created_at);
      console.log('');

      // Obtener detalles del despacho
      const { data: despacho } = await supabase
        .from('despachos')
        .select('pedido_id, origen, destino, scheduled_local_date, scheduled_local_time')
        .eq('id', viaje.despacho_id)
        .single();

      if (despacho) {
        console.log('📄 DESPACHO:');
        console.log('   Pedido:', despacho.pedido_id);
        console.log('   Origen:', despacho.origen);
        console.log('   Destino:', despacho.destino);
        console.log('   Fecha:', despacho.scheduled_local_date, despacho.scheduled_local_time);
        console.log('');
      }

      // Obtener info del camión
      const camionId = viaje.camion_id || viaje.id_camion;
      if (camionId) {
        const { data: camion } = await supabase
          .from('camiones')
          .select('patente, marca, modelo')
          .eq('id', camionId)
          .single();

        if (camion) {
          console.log('🚛 CAMIÓN:');
          console.log('   Patente:', camion.patente);
          console.log('   Modelo:', camion.marca, camion.modelo);
          console.log('');
        }
      }
    }

    console.log('═══════════════════════════════════════════');

    // 4. Verificar la consulta que hace la app móvil
    console.log('\n4️⃣ SIMULANDO CONSULTA DE LA APP MÓVIL...\n');
    
    const { data: viajesApp, error: errorApp } = await supabase
      .from('viajes_despacho')
      .select(`
        id,
        numero_viaje,
        despacho_id,
        estado,
        estado_unidad,
        observaciones,
        despachos!inner (
          pedido_id,
          origen,
          destino,
          scheduled_local_date,
          scheduled_local_time,
          type
        ),
        camiones (
          patente,
          marca,
          modelo
        )
      `)
      .eq('chofer_id', chofer.id)
      .in('estado', ['asignado', 'confirmado', 'en_curso', 'transporte_asignado'])
      .order('created_at', { ascending: false });

    if (errorApp) {
      console.error('❌ Error en consulta de app:', errorApp);
    } else {
      console.log(`✅ Consulta de app ejecutada: ${viajesApp?.length || 0} viajes encontrados`);
      if (viajesApp && viajesApp.length > 0) {
        console.log('\n✅ LA APP DEBERÍA MOSTRAR ESTOS VIAJES:');
        viajesApp.forEach((v, i) => {
          console.log(`\n${i + 1}. ${v.numero_viaje}`);
          console.log(`   Estado: ${v.estado} / ${v.estado_unidad}`);
          const desp = Array.isArray(v.despachos) ? v.despachos[0] : v.despachos;
          if (desp) {
            console.log(`   Pedido: ${desp.pedido_id}`);
            console.log(`   Ruta: ${desp.origen} → ${desp.destino}`);
          }
        });
      } else {
        console.log('\n⚠️  La app NO encuentra viajes con los filtros actuales');
        console.log('   Filtros: estado IN (asignado, confirmado, en_curso, transporte_asignado)');
      }
    }

    console.log('\n═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

diagnosticar();

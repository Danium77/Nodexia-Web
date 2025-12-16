// Script para crear un viaje de prueba para Walter Zayas
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WALTER_USER_ID = '50da5768-b203-4719-ad16-62e03e2b151a';
const EMPRESA_ID = '3d54e9c6-ea04-4c51-86c4-41abe3968308'; // Logística Express

async function crearViajePrueba() {
  try {
    console.log('🔍 Obteniendo datos necesarios...\n');

    // 1. Obtener ID del chofer
    const { data: chofer, error: errorChofer } = await supabase
      .from('choferes')
      .select('id, nombre, apellido')
      .eq('user_id', WALTER_USER_ID)
      .single();

    if (errorChofer) throw errorChofer;
    console.log('✅ Chofer encontrado:', chofer);

    // 2. Obtener un camión de la empresa
    const { data: camiones, error: errorCamion } = await supabase
      .from('camiones')
      .select('id, patente, marca, modelo')
      .eq('id_transporte', EMPRESA_ID)
      .limit(1);

    if (errorCamion) throw errorCamion;
    
    let camionId = null;
    if (camiones && camiones.length > 0) {
      camionId = camiones[0].id;
      console.log('✅ Camión encontrado:', camiones[0]);
    } else {
      console.log('⚠️  No hay camiones registrados, creando uno...');
      const { data: nuevoCamion, error: errorNuevoCamion } = await supabase
        .from('camiones')
        .insert({
          patente: 'ABC123',
          marca: 'Mercedes-Benz',
          modelo: 'Actros 2041',
          anio: 2020,
          id_transporte: EMPRESA_ID,
          capacidad_carga: 25000,
          estado: 'disponible'
        })
        .select()
        .single();
      
      if (errorNuevoCamion) throw errorNuevoCamion;
      camionId = nuevoCamion.id;
      console.log('✅ Camión creado:', nuevoCamion);
    }

    // 3. Crear un despacho de prueba
    console.log('\n📦 Creando despacho de prueba...');
    const { data: despacho, error: errorDespacho } = await supabase
      .from('despachos')
      .insert({
        pedido_id: 'PED-TEST-' + Date.now(),
        origen: 'Puerto de Buenos Aires - Terminal 4',
        destino: 'Depósito Central Rosario - Av. Circunvalación 2500',
        scheduled_local_date: new Date().toISOString().split('T')[0],
        scheduled_local_time: '14:00',
        type: 'contenedor',
        estado: 'confirmado',
        empresa_id: EMPRESA_ID
      })
      .select()
      .single();

    if (errorDespacho) throw errorDespacho;
    console.log('✅ Despacho creado:', despacho);

    // 4. Crear el viaje
    console.log('\n🚛 Creando viaje asignado a Walter...');
    const numeroViaje = 'VJ-' + Date.now().toString().slice(-6);
    
    const { data: viaje, error: errorViaje } = await supabase
      .from('viajes_despacho')
      .insert({
        numero_viaje: numeroViaje,
        despacho_id: despacho.id,
        chofer_id: chofer.id,
        camion_id: camionId,
        estado: 'asignado',
        estado_unidad: 'asignado',
        observaciones: 'Viaje de prueba para testear app móvil',
        empresa_id: EMPRESA_ID
      })
      .select(`
        id,
        numero_viaje,
        estado,
        estado_unidad,
        despachos (
          pedido_id,
          origen,
          destino,
          scheduled_local_date,
          scheduled_local_time
        ),
        camiones (
          patente,
          marca,
          modelo
        )
      `)
      .single();

    if (errorViaje) throw errorViaje;

    console.log('\n✅ ¡VIAJE CREADO EXITOSAMENTE!\n');
    console.log('═══════════════════════════════════════════');
    console.log('📋 INFORMACIÓN DEL VIAJE');
    console.log('═══════════════════════════════════════════');
    console.log('ID:', viaje.id);
    console.log('Número:', viaje.numero_viaje);
    console.log('Estado:', viaje.estado);
    console.log('Estado Unidad:', viaje.estado_unidad);
    console.log('\n📦 DESPACHO:');
    console.log('Pedido:', viaje.despachos.pedido_id);
    console.log('Origen:', viaje.despachos.origen);
    console.log('Destino:', viaje.despachos.destino);
    console.log('Fecha:', viaje.despachos.scheduled_local_date);
    console.log('Hora:', viaje.despachos.scheduled_local_time);
    console.log('\n🚛 VEHÍCULO:');
    console.log('Patente:', viaje.camiones.patente);
    console.log('Modelo:', viaje.camiones.marca, viaje.camiones.modelo);
    console.log('═══════════════════════════════════════════');
    console.log('\n✨ Walter ya puede ver este viaje en su app móvil\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

crearViajePrueba();

// scripts/setup-e2e-data.js
// Configura datos específicos para tests E2E

const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupE2EData() {
  console.log('🎯 Configurando datos para tests E2E...\n');

  try {
    // 1. Crear usuario chofer de test
    console.log('👤 Creando usuario chofer test...');
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'chofer.test@nodexia.com',
      password: 'password123',
      email_confirm: true
    });

    if (authError && !authError.message.includes('already been registered')) {
      console.error('❌ Error creando usuario auth:', authError);
      return;
    }

    const userId = authUser?.user?.id || (await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'chofer.test@nodexia.com')
      .single())?.data?.id;

    console.log('✅ Usuario auth creado/encontrado:', userId);

    // 2. Buscar empresa demo
    const { data: empresaDemo } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('razon_social', 'Nodexia Demo S.A.')
      .single();

    if (!empresaDemo) {
      console.error('❌ No se encontró empresa demo. Ejecutar seed_demo_users_updated.js primero');
      return;
    }

    console.log('🏢 Empresa demo encontrada:', empresaDemo.id);

    // 3. Crear chofer
    console.log('🚛 Creando chofer test...');
    
    const { data: choferTest, error: choferError } = await supabaseAdmin
      .from('choferes')
      .upsert({
        usuario_id: userId,
        empresa_id: empresaDemo.id,
        nombre: 'Chofer',
        apellido: 'Test',
        dni: '99999999',
        telefono: '+54 9 999 999999',
        email: 'chofer.test@nodexia.com',
        estado: 'disponible'
      })
      .select()
      .single();

    if (choferError) {
      console.error('❌ Error creando chofer:', choferError);
      return;
    }

    console.log('✅ Chofer test creado:', choferTest.id);

    // 4. Buscar/crear camión test
    console.log('🚚 Configurando camión test...');
    
    const { data: camionTest, error: camionError } = await supabaseAdmin
      .from('camiones')
      .upsert({
        empresa_id: empresaDemo.id,
        patente: 'TEST123',
        marca: 'Volvo',
        modelo: 'FH16',
        year: 2022,
        tipo_carroceria: 'Chasis',
        estado: 'disponible'
      })
      .select()
      .single();

    if (camionError) {
      console.error('❌ Error creando camión:', camionError);
      return;
    }

    console.log('✅ Camión test configurado:', camionTest.id);

    // 5. Buscar/crear cliente test
    console.log('🏬 Configurando cliente test...');
    
    const { data: clienteTest, error: clienteError } = await supabaseAdmin
      .from('clientes')
      .upsert({
        empresa_id: empresaDemo.id,
        razon_social: 'Cliente Test S.A.',
        nombre_comercial: 'Cliente Test',
        cuit: '20-99999999-9',
        email: 'cliente.test@nodexia.com',
        telefono: '+54 9 999 888777'
      })
      .select()
      .single();

    if (clienteError) {
      console.error('❌ Error creando cliente:', clienteError);
      return;
    }

    console.log('✅ Cliente test configurado:', clienteTest.id);

    // 6. Crear despacho test
    console.log('📦 Creando despacho test...');
    
    const { data: despachoTest, error: despachoError } = await supabaseAdmin
      .from('despachos')
      .insert({
        empresa_id: empresaDemo.id,
        cliente_id: clienteTest.id,
        pedido_id: 'TEST-001',
        origen: 'Planta Test',
        destino: 'Cliente Test',
        origen_ciudad: 'Buenos Aires',
        origen_provincia: 'Buenos Aires',
        destino_ciudad: 'Córdoba',
        destino_provincia: 'Córdoba',
        scheduled_local_date: new Date().toISOString().split('T')[0],
        scheduled_local_time: '08:00',
        type: 'carga'
      })
      .select()
      .single();

    if (despachoError) {
      console.error('❌ Error creando despacho:', despachoError);
      return;
    }

    console.log('✅ Despacho test creado:', despachoTest.id);

    // 7. Crear viaje test activo
    console.log('🛣️ Creando viaje test activo...');
    
    const { data: viajeTest, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .insert({
        empresa_id: empresaDemo.id,
        despacho_id: despachoTest.id,
        chofer_id: choferTest.id,
        camion_id: camionTest.id,
        numero_viaje: 9999,
        estado: 'confirmado_chofer', // Estado que permite tracking GPS
        fecha_inicio: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (viajeError) {
      console.error('❌ Error creando viaje:', viajeError);
      return;
    }

    console.log('✅ Viaje test activo creado:', viajeTest.id);

    // 8. Crear segundo viaje para testing de selección múltiple
    console.log('🛣️ Creando segundo viaje test...');
    
    const { data: viajeTest2, error: viajeError2 } = await supabaseAdmin
      .from('viajes_despacho')
      .insert({
        empresa_id: empresaDemo.id,
        despacho_id: despachoTest.id,
        chofer_id: choferTest.id,
        camion_id: camionTest.id,
        numero_viaje: 9998,
        estado: 'en_transito_origen', // Otro estado válido para GPS
        fecha_inicio: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (viajeError2) {
      console.error('❌ Error creando segundo viaje:', viajeError2);
      return;
    }

    console.log('✅ Segundo viaje test creado:', viajeTest2.id);

    console.log('\n🎉 Datos E2E configurados exitosamente!');
    console.log('\n📋 Resumen de datos creados:');
    console.log(`   👤 Usuario: chofer.test@nodexia.com (${userId})`);
    console.log(`   🚛 Chofer: ${choferTest.nombre} ${choferTest.apellido} (${choferTest.id})`);
    console.log(`   🚚 Camión: ${camionTest.patente} (${camionTest.id})`);
    console.log(`   🏬 Cliente: ${clienteTest.razon_social} (${clienteTest.id})`);
    console.log(`   📦 Despacho: ${despachoTest.pedido_id} (${despachoTest.id})`);
    console.log(`   🛣️ Viaje 1: #${viajeTest.numero_viaje} - ${viajeTest.estado} (${viajeTest.id})`);
    console.log(`   🛣️ Viaje 2: #${viajeTest2.numero_viaje} - ${viajeTest2.estado} (${viajeTest2.id})`);
    console.log('\n✅ Los tests E2E pueden ejecutarse ahora');

  } catch (error) {
    console.error('❌ Error en setup E2E:', error);
  }
}

// Función para limpiar datos E2E
async function cleanupE2EData() {
  console.log('🧹 Limpiando datos de test E2E...\n');

  try {
    // Eliminar en orden correcto (relaciones FK)
    const choferEmail = 'chofer.test@nodexia.com';
    
    // 1. Buscar chofer test
    const { data: choferTest } = await supabaseAdmin
      .from('choferes')
      .select('id, usuario_id')
      .eq('email', choferEmail)
      .single();

    if (!choferTest) {
      console.log('ℹ️ No se encontraron datos E2E para limpiar');
      return;
    }

    // 2. Eliminar viajes
    await supabaseAdmin
      .from('viajes_despacho')
      .delete()
      .eq('chofer_id', choferTest.id);

    // 3. Eliminar ubicaciones GPS
    await supabaseAdmin
      .from('ubicaciones_choferes')
      .delete()
      .eq('chofer_id', choferTest.id);

    // 4. Eliminar despachos del cliente test
    const { data: clienteTest } = await supabaseAdmin
      .from('clientes')
      .select('id')
      .eq('email', 'cliente.test@nodexia.com')
      .single();

    if (clienteTest) {
      await supabaseAdmin
        .from('despachos')
        .delete()
        .eq('cliente_id', clienteTest.id);

      await supabaseAdmin
        .from('clientes')
        .delete()
        .eq('id', clienteTest.id);
    }

    // 5. Eliminar camión test
    await supabaseAdmin
      .from('camiones')
      .delete()
      .eq('patente', 'TEST123');

    // 6. Eliminar chofer
    await supabaseAdmin
      .from('choferes')
      .delete()
      .eq('id', choferTest.id);

    // 7. Eliminar usuario auth
    if (choferTest.usuario_id) {
      await supabaseAdmin.auth.admin.deleteUser(choferTest.usuario_id);
    }

    console.log('✅ Datos E2E limpiados exitosamente');

  } catch (error) {
    console.error('❌ Error limpiando datos E2E:', error);
  }
}

// Ejecutar según argumento
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupE2EData();
} else {
  setupE2EData();
}
// Investigar por qué el despacho no aparece en Despachos Ofrecidos
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigarDespachoNoVisible() {
  console.log('🔍 INVESTIGACIÓN: Despacho no visible en Transporte Nodexia\n');

  // 1. Buscar el despacho creado hoy
  console.log('📋 PASO 1: Buscar despacho DSP-20260206-001');
  const { data: despacho, error: dspError } = await supabase
    .from('viajes_despacho')
    .select('*')
    .eq('numero_despacho', 'DSP-20260206-001')
    .single();

  if (dspError || !despacho) {
    console.log('❌ No se encontró el despacho');
    console.log('Buscando cualquier despacho de hoy...\n');
    
    const { data: despachosHoy } = await supabase
      .from('viajes_despacho')
      .select('numero_despacho, empresa_transporte_id, estado_carga_viaje')
      .gte('created_at', '2026-02-06T00:00:00')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (despachosHoy && despachosHoy.length > 0) {
      console.log('Despachos de hoy:');
      despachosHoy.forEach(d => {
        console.log(`  - ${d.numero_despacho}: transporte=${d.empresa_transporte_id}, estado=${d.estado_carga_viaje}`);
      });
    }
  } else {
    console.log('✅ Despacho encontrado:');
    console.log(`   Número: ${despacho.numero_despacho}`);
    console.log(`   Transporte UUID: ${despacho.empresa_transporte_id}`);
    console.log(`   Estado: ${despacho.estado_carga_viaje}`);
    console.log(`   Origen ID: ${despacho.origen_id}`);
    console.log(`   Destino ID: ${despacho.destino_id}`);
    console.log('');
  }

  // 2. Verificar UUID de Transporte Nodexia
  console.log('🏢 PASO 2: UUID de Transporte Nodexia S.R.L');
  const { data: transporteNodexia, error: tnError } = await supabase
    .from('empresas')
    .select('id, nombre, cuit, tipo_empresa')
    .or('nombre.ilike.%nodexia%,cuit.eq.20-28848617-5')
    .eq('tipo_empresa', 'transporte');

  if (!tnError && transporteNodexia) {
    transporteNodexia.forEach(t => {
      console.log(`   - ${t.nombre}`);
      console.log(`     UUID: ${t.id}`);
      console.log(`     CUIT: ${t.cuit}`);
      console.log(`     Tipo: ${t.tipo_empresa}\n`);
    });
  }

  // 3. Verificar usuario coordinador de transporte
  console.log('👤 PASO 3: Usuario walter@nodexia.com');
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select('id, email')
    .eq('email', 'walter@nodexia.com')
    .single();

  if (!userError && usuario) {
    console.log(`   User ID: ${usuario.id}`);
    
    const { data: empresas } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id, rol_interno')
      .eq('user_id', usuario.id);
    
    if (empresas) {
      console.log('   Empresas vinculadas:');
      for (const emp of empresas) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nombre, tipo_empresa')
          .eq('id', emp.empresa_id)
          .single();
        
        console.log(`     - ${empresa?.nombre || emp.empresa_id}`);
        console.log(`       UUID: ${emp.empresa_id}`);
        console.log(`       Rol: ${emp.rol_interno}\n`);
      }
    }
  }

  // 4. Comparar UUIDs
  console.log('🔍 PASO 4: COMPARACIÓN');
  if (despacho && transporteNodexia && transporteNodexia.length > 0) {
    const uuidDespacho = despacho.empresa_transporte_id;
    const uuidTransporte = transporteNodexia[0].id;
    
    console.log(`   UUID en despacho: ${uuidDespacho}`);
    console.log(`   UUID de empresa:  ${uuidTransporte}`);
    console.log(`   ¿Coinciden?: ${uuidDespacho === uuidTransporte ? '✅ SÍ' : '❌ NO'}`);
  }

  console.log('\n✅ Análisis completado');
}

investigarDespachoNoVisible().catch(console.error);

// Verificar estructura de viajes_despacho y el despacho específico
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarEstructuraYDespacho() {
  console.log('🔍 VERIFICACIÓN DE ESTRUCTURA Y DESPACHO\n');

  // 1. Ver estructura del último viaje creado
  console.log('📋 PASO 1: Estructura del último viaje creado hoy');
  const { data: ultimoViaje } = await supabase
    .from('viajes_despacho')
    .select('*')
    .gte('created_at', '2026-02-06T00:00:00')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (ultimoViaje) {
    console.log('✅ Último viaje encontrado:');
    console.log('   Columnas que contienen "transporte":');
    Object.keys(ultimoViaje).filter(k => k.includes('transporte')).forEach(key => {
      console.log(`     - ${key}: ${ultimoViaje[key]}`);
    });
    console.log('\n   Todas las columnas:');
    console.log('   ', Object.keys(ultimoViaje).join(', '));
    console.log('\n   Datos completos:');
    console.log(JSON.stringify(ultimoViaje, null, 2));
  }

  // 2. Verificar UUIDs de empresas
  console.log('\n🏢 PASO 2: UUIDs de empresas involucradas');
  
  // Aceitera San Miguel
  const { data: aceitera } = await supabase
    .from('empresas')
    .select('id, nombre, cuit')
    .ilike('nombre', '%aceitera%miguel%')
    .single();
  
  if (aceitera) {
    console.log(`   Aceitera San Miguel: ${aceitera.id}`);
  }
  
  // Transporte Nodexia
  const { data: transporte } = await supabase
    .from('empresas')
    .select('id, nombre, cuit')
    .eq('cuit', '20-28848617-5')
    .single();
  
  if (transporte) {
    console.log(`   Transporte Nodexia: ${transporte.id}`);
  }

  // 3. Usuario walter@nodexia.com
  console.log('\n👤 PASO 3: Empresas de walter@nodexia.com');
  const { data: walter } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', 'walter@nodexia.com')
    .single();
  
  if (walter) {
    const { data: empresasWalter } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id')
      .eq('user_id', walter.id);
    
    if (empresasWalter) {
      console.log(`   Walter tiene ${empresasWalter.length} empresa(s):`);
      empresasWalter.forEach(e => {
        console.log(`     - ${e.empresa_id}`);
      });
    }
  }

  console.log('\n✅ Verificación completada');
}

verificarEstructuraYDespacho().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKey() {
  console.log('🔍 Verificando Foreign Key constraint...\n');

  // Verificar si el transporte existe en la tabla correcta
  const transportId = '2f869cfe-d395-4d9d-9d02-b21040266ffd';
  
  console.log(`🔎 Buscando transporte ID: ${transportId}\n`);

  // Buscar en tabla transportes
  const { data: transporteData, error: transporteError } = await supabase
    .from('transportes')
    .select('*')
    .eq('id', transportId);

  console.log('📊 En tabla transportes:');
  if (transporteError) {
    console.log('  ❌ Error:', transporteError.message);
  } else if (transporteData && transporteData.length > 0) {
    console.log('  ✅ ENCONTRADO:', transporteData[0].nombre || transporteData[0]);
  } else {
    console.log('  ⚠️  NO encontrado');
  }

  // Buscar en tabla empresas
  const { data: empresaData, error: empresaError } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', transportId);

  console.log('\n📊 En tabla empresas:');
  if (empresaError) {
    console.log('  ❌ Error:', empresaError.message);
  } else if (empresaData && empresaData.length > 0) {
    console.log('  ✅ ENCONTRADO:', empresaData[0].nombre);
  } else {
    console.log('  ⚠️  NO encontrado');
  }

  // Intentar hacer un UPDATE de prueba
  console.log('\n🧪 Intentando UPDATE de prueba...');
  const { data: updateTest, error: updateError } = await supabase
    .from('despachos')
    .update({ transport_id: transportId })
    .eq('pedido_id', 'DSP-20251026-001')
    .select();

  if (updateError) {
    console.log('❌ Error en UPDATE:', updateError);
    console.log('   Code:', updateError.code);
    console.log('   Message:', updateError.message);
    console.log('   Details:', updateError.details);
  } else {
    console.log('✅ UPDATE exitoso:', updateTest);
  }
}

checkForeignKey()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

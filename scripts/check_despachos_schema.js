require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Verificando estructura de tabla despachos...\n');
  
  // 1. Obtener estructura de la tabla
  const { data, error } = await supabase
    .from('despachos')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('📋 Columnas de la tabla despachos:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof data[0][key]}`);
    });
  } else {
    console.log('⚠️  No hay registros en despachos');
    
    // Intentar obtener el schema de otra forma
    const { data: schemaData, error: schemaError } = await supabase
      .from('despachos')
      .select()
      .limit(0);
    
    console.log('\nSchema info:', schemaData);
  }

  // 2. Verificar si existe tabla transportes
  console.log('\n🔍 Verificando tabla transportes...');
  const { data: transportes, error: transportesError } = await supabase
    .from('transportes')
    .select('id, nombre')
    .limit(1);

  if (transportesError) {
    console.log('❌ Tabla transportes no accesible:', transportesError.message);
  } else {
    console.log('✅ Tabla transportes existe');
  }

  // 3. Verificar si existe tabla empresas
  console.log('\n🔍 Verificando tabla empresas (alternativa)...');
  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa')
    .eq('tipo_empresa', 'transporte')
    .limit(3);

  if (empresasError) {
    console.log('❌ Error:', empresasError.message);
  } else {
    console.log('✅ Empresas de transporte:', empresas?.length);
    empresas?.forEach(e => console.log(`   - ${e.nombre} (${e.id})`));
  }
}

main();

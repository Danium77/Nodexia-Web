require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigarEstructura() {
  console.log('🔍 Investigando estructura de plantas y clientes...');
  
  try {
    // 1. Verificar si existen tablas específicas
    console.log('\n1️⃣ Verificando tablas específicas...');
    
    const tablasAVerificar = ['plantas', 'clientes', 'plantas_empresa', 'clientes_empresa'];
    
    for (const tabla of tablasAVerificar) {
      try {
        const { data, error } = await supabase.from(tabla).select('*').limit(1);
        console.log(`  ${tabla}: ${error ? '❌ NO EXISTE' : '✅ EXISTE'}`);
        if (error && !error.message.includes('does not exist')) {
          console.log(`    Error: ${error.message}`);
        }
      } catch (e) {
        console.log(`  ${tabla}: ❌ NO EXISTE (${e.message})`);
      }
    }

    // 2. Ver qué tipos de empresa existen
    console.log('\n2️⃣ Tipos de empresa existentes:');
    const { data: empresas } = await supabase
      .from('empresas')
      .select('tipo_empresa')
      .not('tipo_empresa', 'is', null);
    
    const tipos = [...new Set(empresas?.map(e => e.tipo_empresa))];
    tipos.forEach(tipo => console.log(`  - ${tipo}`));

    // 3. Ver si hay empresas que podrían ser plantas/clientes
    console.log('\n3️⃣ Empresas por tipo:');
    for (const tipo of tipos) {
      const { data: count } = await supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .eq('tipo_empresa', tipo);
      console.log(`  ${tipo}: ${count?.length || 0} empresas`);
    }

    // 4. Verificar la estructura de la tabla empresas
    console.log('\n4️⃣ Muestra de estructura empresas:');
    const { data: sample } = await supabase
      .from('empresas')
      .select('*')
      .limit(3);
    
    if (sample?.[0]) {
      console.log('  Columnas disponibles:', Object.keys(sample[0]));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

investigarEstructura().catch(console.error);
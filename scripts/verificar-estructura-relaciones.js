// Script para verificar la estructura real de relaciones en BD
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarEstructura() {
  console.log('🔍 Verificando estructura de relaciones...\n');

  // 1. Verificar qué tablas de relaciones existen
  console.log('📋 TABLAS DE RELACIONES:');
  const tablasPosibles = [
    'relaciones_empresa',
    'relaciones_empresas', 
    'planta_transportes'
  ];

  for (const tabla of tablasPosibles) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log(`✅ ${tabla} - EXISTE`);
      if (data && data.length > 0) {
        console.log(`   Columnas:`, Object.keys(data[0]).join(', '));
      } else {
        // Tabla existe pero está vacía, intentar ver estructura
        const { data: empty } = await supabase
          .from(tabla)
          .select('*')
          .limit(0);
        console.log(`   (vacía)`);
      }
    } else {
      console.log(`❌ ${tabla} - NO EXISTE`);
    }
  }

  // 2. Ver tipos de empresas
  console.log('\n📊 TIPOS DE EMPRESAS:');
  const { data: empresas, error: empError } = await supabase
    .from('empresas')
    .select('tipo_empresa')
    .limit(100);

  if (!empError && empresas) {
    const tipos = [...new Set(empresas.map(e => e.tipo_empresa))];
    console.log('Tipos encontrados:', tipos.join(', '));
    
    tipos.forEach(tipo => {
      const count = empresas.filter(e => e.tipo_empresa === tipo).length;
      console.log(`  - ${tipo}: ${count} empresas`);
    });
  }

  // 3. Ver relaciones existentes (si la tabla existe)
  console.log('\n🔗 RELACIONES EXISTENTES:');
  
  for (const tabla of tablasPosibles) {
    const { data: relaciones, error } = await supabase
      .from(tabla)
      .select('*')
      .limit(5);
    
    if (!error && relaciones && relaciones.length > 0) {
      console.log(`\nEn tabla "${tabla}":`);
      console.log(JSON.stringify(relaciones, null, 2));
      break;
    }
  }

  console.log('\n✅ Verificación completada');
}

verificarEstructura().catch(console.error);

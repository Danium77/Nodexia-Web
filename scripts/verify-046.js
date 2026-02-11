// Script para verificar que la migración 046_CORREGIDO se ejecutó correctamente
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔍 Verificando migración 046_CORREGIDO...\n');
  
  const tablesToCheck = [
    'documentos_entidad',
    'auditoria_documentos',
    'documentos_viaje_seguro'
  ];
  
  let allOk = true;
  
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabla ${table}: NO EXISTE`);
        console.log(`   Error: ${error.message}`);
        allOk = false;
      } else {
        console.log(`✅ Tabla ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ Tabla ${table}: ERROR`);
      console.log(`   ${err.message}`);
      allOk = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allOk) {
    console.log('✅ MIGRACIÓN 046 COMPLETADA EXITOSAMENTE');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Configurar buckets de Supabase Storage');
    console.log('2. Implementar módulo de documentación');
  } else {
    console.log('❌ MIGRACIÓN INCOMPLETA - Revisar SQL en Supabase');
  }
  console.log('='.repeat(50));
}

verify();

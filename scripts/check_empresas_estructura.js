/**
 * Script para verificar la estructura de la tabla empresas
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmpresas() {
  console.log('📊 Consultando empresas en base de datos...\n');
  
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Encontradas ${data.length} empresas\n`);
  
  if (data.length > 0) {
    console.log('📋 Estructura de la primera empresa:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\n📋 Todas las empresas:');
    data.forEach((emp, i) => {
      console.log(`\n${i + 1}. ${emp.nombre}`);
      console.log(`   ID: ${emp.id}`);
      console.log(`   Columnas:`, Object.keys(emp).join(', '));
    });
  }
}

checkEmpresas();

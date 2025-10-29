// Script para verificar la tabla empresa_ubicaciones
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  console.log('🔍 Verificando tabla empresa_ubicaciones...\n');
  
  const { data, error } = await supabase
    .from('empresa_ubicaciones')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('❌ La tabla empresa_ubicaciones NO existe o no es accesible');
    console.log('Error:', error.message);
  } else {
    console.log('✅ La tabla empresa_ubicaciones existe');
    console.log(`📊 Registros actuales: ${data?.length || 0}\n`);
    
    if (data && data.length > 0) {
      console.log('Registros:');
      data.forEach((r, i) => console.log(`${i+1}.`, JSON.stringify(r, null, 2)));
    } else {
      console.log('⚠️ No hay vínculos empresa-ubicación aún');
    }
  }
}

checkTable().then(() => process.exit(0));

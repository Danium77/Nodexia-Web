const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Verificando estructura de tablas...');
  
  const tables = ['transportes', 'despachos', 'choferes'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (data && data.length > 0) {
        console.log(`\n📋 ${table.toUpperCase()}:`);
        console.log('Columnas:', Object.keys(data[0]));
      } else if (error) {
        console.log(`\n❌ ${table}: ${error.message}`);
      } else {
        console.log(`\n📋 ${table.toUpperCase()}: (vacía, no se pueden ver columnas)`);
      }
    } catch (e) {
      console.log(`\n❌ ${table}: ${e.message}`);
    }
  }
}

checkTables().catch(console.error);
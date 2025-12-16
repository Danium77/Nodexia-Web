require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
  console.log('🔍 Buscando triggers en tabla usuarios_empresa...\n');
  
  // Query para listar triggers
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        t.tgname AS trigger_name,
        p.proname AS function_name,
        pg_get_triggerdef(t.oid) AS trigger_definition
      FROM pg_trigger t
      INNER JOIN pg_class c ON t.tgrelid = c.oid
      INNER JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname = 'usuarios_empresa'
      AND t.tgisinternal = false;
    `
  });
  
  if (error) {
    // Try alternative method
    console.log('⚠️  rpc no disponible, intentando con query directa...\n');
    
    // Verificar constraints
    const { data: constraints } = await supabase
      .from('pg_constraint')
      .select('*');
      
    console.log('Constraints:', constraints);
  } else {
    console.log('Triggers encontrados:', data);
  }
}

checkTriggers().catch(console.error);

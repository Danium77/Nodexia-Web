require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('🔍 Buscando constraints y triggers en Supabase...\n');
  
  // Crear una función temporal que consulte pg_trigger
  const sqlQuery = `
    SELECT 
      tgname as trigger_name,
      tgenabled as enabled,
      proname as function_name
    FROM pg_trigger
    JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'usuarios_empresa'
    AND NOT tgisinternal;
  `;
  
  console.log('Ejecutando query para listar triggers...\n');
  console.log(sqlQuery);
  console.log('\n⚠️  Debes ejecutar esto en Supabase SQL Editor\n');
  
  // También buscar constraints
  const sqlConstraints = `
    SELECT 
      conname AS constraint_name,
      contype AS constraint_type,
      pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'public.usuarios_empresa'::regclass;
  `;
  
  console.log('Query para constraints:\n');
  console.log(sqlConstraints);
}

checkConstraints().catch(console.error);

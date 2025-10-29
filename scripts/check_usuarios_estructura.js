/**
 * Script para verificar la estructura de la tabla usuarios
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsuarios() {
  console.log('📊 Consultando usuarios en base de datos...\n');
  
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('📋 Estructura de la tabla usuarios:');
    console.log('Columnas:', Object.keys(data[0]).join(', '));
    console.log('\n📋 Ejemplo de usuario:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️ No hay usuarios en la tabla');
  }
}

checkUsuarios();

/**
 * Script para verificar la estructura de la tabla usuarios_empresa
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsuariosEmpresa() {
  console.log('📊 Consultando usuarios_empresa en base de datos...\n');
  
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('📋 Estructura de la tabla usuarios_empresa:');
    console.log('Columnas:', Object.keys(data[0]).join(', '));
    console.log('\n📋 Ejemplo:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️ No hay registros en usuarios_empresa');
  }
}

checkUsuariosEmpresa();

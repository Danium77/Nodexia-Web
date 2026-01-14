const { createClient } = require('@supabase/supabase-js');
// NOTA: Usar variables de entorno para credenciales
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkRelaciones() {
  console.log('\n=== RELACIONES_EMPRESAS ===');
  const { data: relaciones, error: relError } = await supabase
    .from('relaciones_empresas')
    .select('*');
  
  if (relError) {
    console.log('ERROR:', JSON.stringify(relError, null, 2));
  } else {
    console.log('Total registros:', relaciones.length);
    console.log(JSON.stringify(relaciones, null, 2));
  }

  console.log('\n=== EMPRESAS (plantas) ===');
  const { data: plantas } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa')
    .neq('tipo_empresa', 'transporte');
  console.log(JSON.stringify(plantas, null, 2));

  console.log('\n=== EMPRESAS (transportes) ===');
  const { data: transportes } = await supabase
    .from('empresas')
    .select('id, nombre, cuit')
    .eq('tipo_empresa', 'transporte');
  console.log(JSON.stringify(transportes, null, 2));

  process.exit(0);
}

checkRelaciones();

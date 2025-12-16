const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ngnaxqwxptccqvbpvwqm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbmF4cXd4cHRjY3F2YnB2d3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3NTU2MTIsImV4cCI6MjA0NjMzMTYxMn0.Ug2OBIXsz-_G9TGU8CoYv-r7_U1nUKJcx6cXy-pqMxw'
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

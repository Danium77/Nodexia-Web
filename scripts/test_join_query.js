const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJoinQuery() {
  console.log('🔍 Probando query JOIN de relaciones_empresa...\n');

  const empresaId = '3cc1979e-1672-48b8-a5e5-2675f5cac527';

  // Query EXACTA del modal
  const { data: relaciones, error } = await supabase
    .from('relaciones_empresa')
    .select(`
      empresa_transporte:empresas!empresa_transporte_id(
        id,
        nombre,
        cuit,
        tipo_empresa
      )
    `)
    .eq('empresa_coordinadora_id', empresaId)
    .eq('estado', 'activa')
    .eq('activo', true);

  console.log('📊 Resultado:');
  console.log(JSON.stringify(relaciones, null, 2));
  
  if (relaciones && relaciones.length > 0) {
    console.log('\n🔎 ID del transporte:');
    console.log('Valor:', relaciones[0].empresa_transporte.id);
    console.log('Tipo:', typeof relaciones[0].empresa_transporte.id);
    console.log('Length:', relaciones[0].empresa_transporte.id.length);
  }

  console.log('\n❌ Error:', error);

  // Comparar con query directa
  console.log('\n\n🔄 Query directa a relaciones_empresa (sin JOIN):');
  const { data: direct } = await supabase
    .from('relaciones_empresa')
    .select('*')
    .eq('empresa_coordinadora_id', empresaId)
    .eq('estado', 'activa')
    .eq('activo', true);

  console.log('empresa_transporte_id:', direct?.[0]?.empresa_transporte_id);
}

testJoinQuery()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

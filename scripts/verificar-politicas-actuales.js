// Verificar políticas RLS usando supabaseAdmin
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarPoliticasRLS() {
  console.log('🔍 VERIFICACIÓN DE POLÍTICAS RLS\n');

  // Query directo a pg_policies
  const { data, error } = await supabaseAdmin
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'relaciones_empresas');

  if (error) {
    console.log('⚠️  No se puede acceder a pg_policies directamente');
    console.log('   Ejecuta el SQL manualmente en Supabase SQL  Editor\n');
    
    // Mostrar el SQL a ejecutar
    console.log('📋 SQL A EJECUTAR:');
    console.log('═'.repeat(60));
    console.log(`
SELECT 
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'relaciones_empresas'
ORDER BY policyname;
    `.trim());
    console.log('═'.repeat(60));
    
  } else {
    console.log('✅ Políticas encontradas:');
    console.log(JSON.stringify(data, null, 2));
  }

  // Verificar si RLS está habilitado
  const { data: tables, error: tabError } = await supabaseAdmin
    .from('pg_tables')
    .select('*')
    .eq('tablename', 'relaciones_empresas');

  if (!tabError && tables && tables.length > 0) {
    console.log('\n📊 Estado de RLS:');
    console.log(`   Tabla: ${tables[0].tablename}`);
    console.log(`   RLS habilitado: ${tables[0].rowsecurity ? '✅ SÍ' : '❌ NO'}`);
  }
}

verificarPoliticasRLS().catch(console.error);

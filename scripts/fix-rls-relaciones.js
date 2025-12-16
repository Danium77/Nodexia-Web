require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('🔧 Verificando configuración RLS de relaciones_empresas...\n');
  
  // 1. Verificar políticas actuales
  console.log('1. Verificando políticas actuales...');
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd')
    .eq('tablename', 'relaciones_empresas');
  
  if (policiesError) {
    console.log('❌ No se pudo verificar políticas (tabla no disponible vía API)');
  } else {
    console.log('Políticas actuales:', policies);
  }
  
  // 2. Probar query de relaciones como usuario autenticado
  console.log('\n2. Probando query de relaciones...');
  const { data: relaciones, error: relacionesError } = await supabase
    .from('relaciones_empresas')
    .select('*')
    .limit(5);
  
  if (relacionesError) {
    console.log('❌ Error al consultar relaciones:', relacionesError.message);
    console.log('Esto indica que RLS está bloqueando. Se necesita acceso directo a la BD.');
  } else {
    console.log('✅ Consulta exitosa. Relaciones encontradas:', relaciones.length);
    console.log(relaciones);
  }
  
  console.log('\n⚠️  Para actualizar políticas RLS, necesitas acceso directo a PostgreSQL');
  console.log('Ejecuta manualmente en tu cliente SQL:');
  console.log(`
DROP POLICY IF EXISTS "Transportes ven sus relaciones" ON relaciones_empresas;

CREATE POLICY "Empresas ven sus relaciones"
ON relaciones_empresas FOR SELECT
TO authenticated
USING (
  empresa_transporte_id = public.uid_empresa() 
  OR empresa_cliente_id = public.uid_empresa()
);
  `);
}

run().catch(console.error);

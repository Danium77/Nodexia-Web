require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  console.log('🔍 Verificando configuración RLS...\n');
  
  // 1. Verificar si RLS está habilitado en viajes_red_nodexia
  console.log('1️⃣ Verificando RLS en viajes_red_nodexia...');
  const { data: tables } = await supabase
    .from('pg_tables')
    .select('tablename, schemaname')
    .eq('tablename', 'viajes_red_nodexia');
  
  if (!tables || tables.length === 0) {
    console.log('❌ No se puede verificar tabla desde API\n');
  }
  
  // 2. Hacer una consulta directa para ver qué está pasando
  console.log('2️⃣ Consultando datos directos...\n');
  
  // Usuarios de Logística Express
  const { data: users } = await supabase
    .from('usuarios_empresa')
    .select('user_id, empresa_id')
    .eq('empresa_id', '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed');
  
  console.log(`Usuarios de Logística Express: ${users?.length || 0}`);
  const userId = users?.[0]?.user_id;
  console.log(`User ID: ${userId}\n`);
  
  // Relaciones activas
  const { data: relaciones } = await supabase
    .from('relaciones_empresas')
    .select('*')
    .eq('empresa_transporte_id', '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed')
    .eq('estado', 'activo');
  
  console.log(`Relaciones activas: ${relaciones?.length || 0}`);
  relaciones?.forEach(r => {
    console.log(`  - Cliente: ${r.empresa_cliente_id}`);
  });
  
  // Viajes en red
  console.log('\n3️⃣ Viajes en Red:');
  const { data: viajes } = await supabase
    .from('viajes_red_nodexia')
    .select('id, empresa_solicitante_id');
  
  console.log(`Total viajes: ${viajes?.length || 0}`);
  viajes?.forEach(v => {
    const bloqueado = relaciones?.some(r => r.empresa_cliente_id === v.empresa_solicitante_id);
    console.log(`  - Viaje ${v.id.substring(0,8)}...`);
    console.log(`    Empresa: ${v.empresa_solicitante_id}`);
    console.log(`    Estado: ${bloqueado ? '🚫 DEBE BLOQUEARSE' : '✅ VISIBLE'}`);
  });
  
  // 4. Verificar el estado de RLS en la tabla
  console.log('\n4️⃣ SQL para verificar RLS (ejecutar en Supabase):\n');
  console.log(`
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'viajes_red_nodexia';
-- Si devuelve 't' (true), RLS está habilitado

SELECT * FROM pg_policies WHERE tablename = 'viajes_red_nodexia';
-- Debe mostrar la política "Solo transportes sin vinculo ven viajes"
  `);
}

checkRLS().catch(console.error);

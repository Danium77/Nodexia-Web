require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLSPolicy() {
  console.log('🧪 Probando política RLS...\n');
  
  // 1. Obtener el user_id del usuario de Logística Express
  const { data: usuario } = await supabase
    .from('usuarios_empresa')
    .select('user_id, empresa_id, empresas(nombre)')
    .eq('empresa_id', '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed')
    .limit(1)
    .single();
  
  if (!usuario) {
    console.log('❌ No se encontró usuario de Logística Express');
    return;
  }
  
  console.log('👤 Usuario Logística Express:');
  console.log(`  User ID: ${usuario.user_id}`);
  console.log(`  Empresa ID: ${usuario.empresa_id}`);
  console.log(`  Empresa: ${usuario.empresas?.nombre}\n`);
  
  // 2. Verificar que la función uid_empresa existe y funciona
  console.log('🔍 Verificando función public.uid_empresa()...');
  const { data: funcExists, error: funcError } = await supabase
    .rpc('uid_empresa');
  
  if (funcError) {
    console.log('❌ Error al llamar uid_empresa():', funcError.message);
  } else {
    console.log('✅ Función uid_empresa() retorna:', funcExists);
  }
  
  // 3. Verificar políticas en viajes_red_nodexia
  console.log('\n🔍 Verificando políticas en viajes_red_nodexia...');
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'viajes_red_nodexia');
  
  if (policies && policies.length > 0) {
    console.log('✅ Políticas encontradas:');
    policies.forEach(p => console.log(`  - ${p.policyname}`));
  } else {
    console.log('⚠️  No se pueden leer políticas desde API');
  }
  
  // 4. Verificar relaciones para Logística Express
  console.log('\n🔍 Relaciones de Logística Express:');
  const { data: relaciones } = await supabase
    .from('relaciones_empresas')
    .select('empresa_cliente_id, empresas!relaciones_empresas_empresa_cliente_id_fkey(nombre), estado')
    .eq('empresa_transporte_id', '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed')
    .eq('estado', 'activo');
  
  console.log(`Total relaciones activas: ${relaciones?.length || 0}`);
  relaciones?.forEach(r => {
    console.log(`  - Cliente: ${r.empresas?.nombre || 'N/A'}`);
    console.log(`    ID: ${r.empresa_cliente_id}`);
  });
  
  // 5. Verificar viajes en Red
  console.log('\n🔍 Viajes en Red Nodexia:');
  const { data: viajes } = await supabase
    .from('viajes_red_nodexia')
    .select('id, empresa_solicitante_id, empresas!viajes_red_nodexia_empresa_solicitante_id_fkey(nombre)');
  
  console.log(`Total viajes: ${viajes?.length || 0}`);
  viajes?.forEach(v => {
    const bloqueado = relaciones?.some(r => r.empresa_cliente_id === v.empresa_solicitante_id);
    console.log(`  - ${v.empresas?.nombre || 'N/A'} ${bloqueado ? '🚫 DEBE BLOQUEARSE' : '✅ VISIBLE'}`);
    console.log(`    Empresa ID: ${v.empresa_solicitante_id}`);
  });
  
  // 6. CRUCIAL: Simular consulta como usuario autenticado
  console.log('\n🔐 Simulando consulta como usuario autenticado...');
  console.log('⚠️  Nota: Esta consulta usa service role, no simula RLS correctamente');
  console.log('Para probar RLS real, necesitas usar el cliente de Supabase desde el navegador\n');
  
  // 7. Verificar si la política está usando la sintaxis correcta
  console.log('📋 Verificación de sintaxis de política:');
  console.log('La política debe usar: public.uid_empresa()');
  console.log('Y debe verificar: re.estado = \'activo\'');
  console.log('\nLa consulta que DEBE bloquear para Logística Express:');
  console.log(`SELECT * FROM viajes_red_nodexia 
WHERE NOT EXISTS (
  SELECT 1 FROM relaciones_empresas re
  WHERE re.empresa_transporte_id = '${usuario.empresa_id}'
  AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
  AND re.estado = 'activo'
);`);
}

testRLSPolicy().catch(console.error);

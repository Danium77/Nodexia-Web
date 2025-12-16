require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Crear cliente CON autenticación del usuario (no service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // Usar anon key, no service role
);

async function testAsUser() {
  console.log('🔐 Probando RLS como usuario autenticado...\n');
  
  // 1. Autenticar como gonzalo@logisticaexpres.com
  const email = 'gonzalo@logisticaexpres.com';
  const password = 'gonzalo123'; // Ajusta si es diferente
  
  console.log(`Intentando autenticar como: ${email}`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.log('❌ Error de autenticación:', authError.message);
    console.log('\n⚠️  No se puede probar RLS sin credenciales correctas');
    console.log('Por favor verifica manualmente en el navegador\n');
    return;
  }
  
  console.log('✅ Autenticado correctamente');
  console.log('User ID:', authData.user.id);
  
  // 2. Verificar empresa del usuario
  const { data: usuarioEmpresa } = await supabase
    .from('usuarios_empresa')
    .select('empresa_id, empresas(nombre)')
    .eq('user_id', authData.user.id)
    .single();
  
  console.log('\n👤 Usuario:');
  console.log('  Empresa:', usuarioEmpresa?.empresas?.nombre);
  console.log('  Empresa ID:', usuarioEmpresa?.empresa_id);
  
  // 3. Consultar viajes_red_nodexia (con RLS aplicado)
  console.log('\n🔍 Consultando viajes_red_nodexia con RLS...');
  const { data: viajes, error: viajesError } = await supabase
    .from('viajes_red_nodexia')
    .select('id, empresa_solicitante_id, empresas!viajes_red_nodexia_empresa_solicitante_id_fkey(nombre)');
  
  if (viajesError) {
    console.log('❌ Error:', viajesError.message);
  } else {
    console.log(`\n📋 Viajes visibles: ${viajes.length}`);
    viajes.forEach(v => {
      console.log(`  - ${v.empresas?.nombre || 'N/A'}`);
      console.log(`    ID: ${v.id}`);
      console.log(`    Empresa: ${v.empresa_solicitante_id}`);
    });
  }
  
  // 4. Verificar relaciones con RLS
  console.log('\n🔍 Consultando relaciones_empresas con RLS...');
  const { data: relaciones, error: relError } = await supabase
    .from('relaciones_empresas')
    .select('empresa_cliente_id, estado')
    .eq('empresa_transporte_id', usuarioEmpresa?.empresa_id)
    .eq('estado', 'activo');
  
  if (relError) {
    console.log('❌ Error:', relError.message);
  } else {
    console.log(`Total relaciones activas: ${relaciones?.length || 0}`);
    relaciones?.forEach(r => {
      console.log(`  Cliente ID: ${r.empresa_cliente_id}`);
    });
  }
  
  // 5. Verificar si Aceitera está en las relaciones
  const aceiteraId = '3cc1979e-1672-48b8-a5e5-2675f5cac527';
  const tieneRelacionAceitera = relaciones?.some(r => r.empresa_cliente_id === aceiteraId);
  
  console.log('\n🎯 Análisis:');
  console.log(`  ¿Tiene relación con Aceitera San Miguel? ${tieneRelacionAceitera ? 'SÍ' : 'NO'}`);
  console.log(`  ¿Viaje de Aceitera visible? ${viajes.some(v => v.empresa_solicitante_id === aceiteraId) ? 'SÍ (❌ ERROR)' : 'NO (✅ CORRECTO)'}`);
  
  await supabase.auth.signOut();
}

testAsUser().catch(console.error);

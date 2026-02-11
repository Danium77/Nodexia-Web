// Test: Simular el INSERT que falló para ver el error real
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Cliente NORMAL (con RLS habilitado)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testInsertConRLS() {
  console.log('🧪 TEST: Insertar relación con RLS habilitado\n');

  // 1. Login como el usuario
  const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'logistica@aceiterasanmiguel.com',
    password: 'Aceitera2024!'
  });

  if (loginError) {
    console.error('❌ Error login:', loginError.message);
    return;
  }

  console.log('✅ Login exitoso:', authData.user.email);

  // 2. Verificar rol del usuario
  const { data: usuarioEmpresa } = await supabase
    .from('usuarios_empresa')
    .select('empresa_id, rol_interno, activo')
    .eq('user_id', authData.user.id)
    .eq('activo', true)
    .single();

  console.log('\n📋 Datos del usuario:');
  console.log('   Empresa ID:', usuarioEmpresa.empresa_id);
  console.log('   Rol:', usuarioEmpresa.rol_interno);
  console.log('   Activo:', usuarioEmpresa.activo);

  // 3. Intentar INSERT (el que fallaba)
  console.log('\n🔧 Intentando INSERT...');
  
  const testData = {
    empresa_cliente_id: usuarioEmpresa.empresa_id,
    empresa_transporte_id: '2f869cfe-d395-4d9d-9d02-b21040266ffd', // Transporte Nodexia
    estado: 'activa',
    fecha_inicio: new Date().toISOString().split('T')[0]
  };

  console.log('   Datos:', JSON.stringify(testData, null, 2));

  const { data: resultado, error: insertError } = await supabase
    .from('relaciones_empresas')
    .insert(testData)
    .select()
    .single();

  if (insertError) {
    console.error('\n❌ ERROR en INSERT:');
    console.error('   Código:', insertError.code);
    console.error('   Mensaje:', insertError.message);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
  } else {
    console.log('\n✅ INSERT exitoso:');
    console.log(JSON.stringify(resultado, null, 2));
  }

  await supabase.auth.signOut();
}

testInsertConRLS().catch(console.error);

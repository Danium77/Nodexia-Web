require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFuncion() {
  console.log('🧪 Testeando función validar_rol_empresa() después de crearla...\n');
  
  // Test 1: Validar rol "Control de Acceso" para tipo "planta"
  console.log('Test 1: Control de Acceso + planta');
  const { data: result1, error: err1 } = await supabase.rpc('validar_rol_empresa', {
    p_rol: 'Control de Acceso',
    p_tipo_empresa: 'planta'
  });
  
  if (err1) {
    console.error('❌ Error:', err1.message);
  } else {
    console.log(`Resultado: ${result1 ? '✅ VÁLIDO' : '❌ NO VÁLIDO'}`);
  }
  
  // Test 2: Verificar directamente en la tabla
  console.log('\nTest 2: Query directa a roles_empresa');
  const { data: roles } = await supabase
    .from('roles_empresa')
    .select('*')
    .eq('nombre_rol', 'Control de Acceso')
    .or('tipo_empresa.eq.planta,tipo_empresa.eq.ambos')
    .eq('activo', true);
    
  console.log(`Roles encontrados: ${roles?.length || 0}`);
  if (roles && roles.length > 0) {
    roles.forEach(r => {
      console.log(`  - ${r.nombre_rol} (${r.tipo_empresa}) - Activo: ${r.activo}`);
    });
  }
  
  // Test 3: Intentar el INSERT nuevamente
  console.log('\nTest 3: Intentar INSERT con rol validado');
  const testData = {
    user_id: '51df118b-69dc-47a9-b20f-8d0b2dbabf9e',
    empresa_id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
    rol_interno: 'Control de Acceso',
    rol_empresa_id: '7918bf3d-b10a-418a-8b8d-24b67e6bad74',
    email_interno: 'test2@test.com',
    nombre_completo: 'Test 2',
    activo: true
  };
  
  const { data: inserted, error: insertErr } = await supabase
    .from('usuarios_empresa')
    .insert(testData)
    .select();
    
  if (insertErr) {
    console.error('\n❌ INSERT FALLÓ:');
    console.error('Code:', insertErr.code);
    console.error('Message:', insertErr.message);
    console.error('Details:', insertErr.details);
    console.error('Hint:', insertErr.hint);
  } else {
    console.log('\n✅ INSERT EXITOSO!');
    // Limpiar
    await supabase.from('usuarios_empresa').delete().eq('id', inserted[0].id);
    console.log('✅ Datos de prueba eliminados');
  }
}

testFuncion().catch(console.error);

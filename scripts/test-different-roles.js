require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTriggersAndConstraints() {
  console.log('🔍 Buscando triggers y constraints en usuarios_empresa...\n');
  
  // Intentar obtener información de triggers mediante una query raw
  // Como no tenemos acceso directo a pg_catalog, vamos a intentar un approach diferente
  
  // 1. Primero, intentar un INSERT y capturar el stack trace completo
  console.log('1. Intentando INSERT para capturar más detalles del error...\n');
  
  const testData = {
    user_id: '51df118b-69dc-47a9-b20f-8d0b2dbabf9e',
    empresa_id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
    rol_interno: 'coordinador', // Probemos con un rol diferente
    rol_empresa_id: '7918bf3d-b10a-418a-8b8d-24b67e6bad74',
    email_interno: 'test-coord@test.com',
    nombre_completo: 'Test Coordinador',
    activo: true
  };
  
  console.log('Probando con rol "coordinador"...');
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .insert(testData)
    .select();
    
  if (error) {
    console.error('❌ Error con "coordinador":');
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Éxito con "coordinador"!');
    await supabase.from('usuarios_empresa').delete().eq('id', data[0].id);
  }
  
  // 2. Probar con Control de Acceso
  console.log('\n\nProbando con rol "Control de Acceso"...');
  testData.rol_interno = 'Control de Acceso';
  testData.email_interno = 'test-control@test.com';
  
  const { data: data2, error: error2 } = await supabase
    .from('usuarios_empresa')
    .insert(testData)
    .select();
    
  if (error2) {
    console.error('❌ Error con "Control de Acceso":');
    console.error(JSON.stringify(error2, null, 2));
  } else {
    console.log('✅ Éxito con "Control de Acceso"!');
    await supabase.from('usuarios_empresa').delete().eq('id', data2[0].id);
  }
}

listTriggersAndConstraints().catch(console.error);

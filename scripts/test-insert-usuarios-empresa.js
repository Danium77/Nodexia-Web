require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('🧪 Testeando INSERT en usuarios_empresa con service role...\n');
  
  const testData = {
    user_id: '51df118b-69dc-47a9-b20f-8d0b2dbabf9e', // Usuario existente (chofer demo)
    empresa_id: '3cc1979e-1672-48b8-a5e5-2675f5cac527', // Aceitera San Miguel
    rol_interno: 'Control de Acceso',
    rol_empresa_id: '7918bf3d-b10a-418a-8b8d-24b67e6bad74',
    email_interno: 'test-temporal@test.com',
    nombre_completo: 'Test Usuario',
    activo: true,
    fecha_vinculacion: new Date().toISOString()
  };
  
  console.log('📋 Datos a insertar:', testData);
  console.log('\n⏳ Ejecutando INSERT...');
  
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .insert(testData)
    .select();
    
  if (error) {
    console.error('\n❌ ERROR AL INSERTAR:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
  } else {
    console.log('\n✅ INSERT EXITOSO!');
    console.log('Datos insertados:', data);
    
    // Limpiar el test
    console.log('\n🧹 Limpiando datos de prueba...');
    await supabase
      .from('usuarios_empresa')
      .delete()
      .eq('id', data[0].id);
    console.log('✅ Limpieza completada');
  }
}

testInsert().catch(console.error);

// Verificar estructura de tabla empresas
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLA EMPRESAS...');
  
  try {
    // Intentar insertar un registro simple para ver la estructura
    const testData = {
      nombre: 'TEST_EMPRESA_TEMP'
    };
    
    const { data, error } = await supabase
      .from('empresas')
      .insert(testData)
      .select();
    
    if (error) {
      console.log('❌ Error insertando (esto nos ayuda a ver la estructura):');
      console.log(error);
    } else {
      console.log('✅ Registro insertado:', data);
      // Borrar el registro de prueba
      await supabase
        .from('empresas')
        .delete()
        .eq('nombre', 'TEST_EMPRESA_TEMP');
      console.log('🧹 Registro de prueba eliminado');
    }
    
    // Ver algunos registros existentes para entender la estructura
    const { data: existing } = await supabase
      .from('empresas')
      .select('*')
      .limit(3);
    
    if (existing && existing.length > 0) {
      console.log('\n📋 REGISTROS EXISTENTES (para ver estructura):');
      existing.forEach((empresa, index) => {
        console.log(`${index + 1}. Estructura:`, Object.keys(empresa));
        console.log(`   Datos:`, empresa);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkTableStructure();
// Verificar estructura de tabla despachos
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTableStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLA DESPACHOS...');
  
  try {
    // Intentar insertar un registro mínimo para ver qué campos acepta
    const testData = {
      pedido_id: 'TEST-STRUCTURE'
    };
    
    const { data, error } = await supabase
      .from('despachos')
      .insert(testData)
      .select();
    
    if (error) {
      console.log('❌ Error insertando (esto nos mostrará los campos requeridos):');
      console.log(error);
    } else {
      console.log('✅ Registro insertado:', data);
      // Borrar el registro de prueba
      await supabase
        .from('despachos')
        .delete()
        .eq('pedido_id', 'TEST-STRUCTURE');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkTableStructure();
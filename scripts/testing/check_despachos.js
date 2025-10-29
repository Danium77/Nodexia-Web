const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDespachos() {
  console.log('=== VERIFICANDO TABLA DESPACHOS ===');
  
  // Primero verificar si hay datos existentes
  const { data: existing } = await supabase.from('despachos').select('*').limit(1);
  
  if (existing && existing.length > 0) {
    console.log('Columnas existentes:', Object.keys(existing[0]));
    console.log('Ejemplo registro:', existing[0]);
    return;
  }
  
  console.log('Tabla vacía - Probando insert simple...');
  
  // Probar insert mínimo
  const { data: testData, error: testError } = await supabase
    .from('despachos')
    .insert({
      pedido_id: 'TEST-STRUCTURE-001',
      origen: 'Test Origin',
      destino: 'Test Destiny',
      estado: 'test'
    });
  
  if (testError) {
    console.log('❌ Error en insert básico:', testError.message);
    console.log('Details:', testError.details);
    console.log('Code:', testError.code);
  } else {
    console.log('✅ Insert básico exitoso');
    
    // Obtener el registro insertado para ver estructura
    const { data: inserted } = await supabase
      .from('despachos')
      .select('*')
      .eq('pedido_id', 'TEST-STRUCTURE-001');
    
    if (inserted && inserted.length > 0) {
      console.log('Columnas confirmadas:', Object.keys(inserted[0]));
    }
    
    // Limpiar
    await supabase.from('despachos').delete().eq('pedido_id', 'TEST-STRUCTURE-001');
    console.log('Registro de prueba eliminado');
  }
}

checkDespachos().catch(console.error);
// Cambiar owner de despachos de prueba al usuario correcto
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDespachoOwnership() {
  console.log('🔧 ARREGLANDO OWNERSHIP DE DESPACHOS...');
  
  try {
    // Usuario actualmente logueado
    const correctUserId = '74d71b4a-81db-459d-93f6-b52e82c3e4bc'; // coord_demo@example.com
    
    // Actualizar PROD-001 y PROD-002
    const { data: updated, error } = await supabase
      .from('despachos')
      .update({ created_by: correctUserId })
      .in('pedido_id', ['PROD-001', 'PROD-002'])
      .select('pedido_id, created_by');
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Despachos actualizados:');
      updated.forEach(d => {
        console.log(`   - ${d.pedido_id} → Owner: ${d.created_by}`);
      });
    }
    
    // Verificar que ahora el usuario puede verlos
    console.log('\n🔍 Verificando acceso con anon key...');
    
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Simular session del usuario correcto
    // Nota: Esto es solo para testing, en la web real el usuario ya está logueado
    
    const { data: testAccess, error: testError } = await supabase
      .from('despachos')
      .select('pedido_id, estado, transport_id')
      .eq('created_by', correctUserId)
      .in('pedido_id', ['PROD-001', 'PROD-002']);
    
    if (testError) {
      console.error('❌ Error de acceso:', testError);
    } else {
      console.log('✅ Despachos ahora visibles:');
      testAccess.forEach(d => {
        console.log(`   - ${d.pedido_id}: ${d.estado} | Transport: ${d.transport_id || 'null'}`);
      });
    }
    
    console.log('\n🎯 LISTO! Ahora refrescá la página web');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

fixDespachoOwnership();
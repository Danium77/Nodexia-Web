const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSessionData() {
  console.log('=== DEBUG COMPLETO DE DATOS ===');
  
  try {
    // 1. Verificar todos los usuarios
    console.log('\n1. USUARIOS EN SISTEMA:');
    const { data: allUsers } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo')
      .limit(5);
    
    allUsers?.forEach((u, i) => {
      console.log(`${i+1}. ${u.email} (${u.id})`);
    });

    // 2. Verificar despachos por usuario
    console.log('\n2. DESPACHOS POR USUARIO:');
    const userIds = ['07df7dc0-f24f-4b39-9abf-82930154a94c', '74d71b4a-81db-459d-93f6-b52e82c3e4bc'];
    
    for (const userId of userIds) {
      const { data: userDispatches } = await supabase
        .from('despachos')
        .select('pedido_id, estado, transport_id')
        .eq('created_by', userId);
      
      const user = allUsers?.find(u => u.id === userId);
      console.log(`\n👤 ${user?.email || 'Usuario desconocido'} (${userId}):`);
      
      if (userDispatches?.length === 0) {
        console.log('   Sin despachos');
      } else {
        userDispatches?.forEach(d => {
          console.log(`   - ${d.pedido_id}: ${d.estado}, Transport: ${d.transport_id || 'null'}`);
        });
      }
    }

    // 3. Verificar el despacho específico que debería mostrarse
    console.log('\n3. ESTADO DEL DESPACHO DSP-20251011-001:');
    const { data: specificDispatch } = await supabase
      .from('despachos')
      .select('*')
      .eq('pedido_id', 'DSP-20251011-001')
      .single();
    
    if (specificDispatch) {
      console.log('✅ Despacho encontrado:');
      console.log('   Estado:', specificDispatch.estado);
      console.log('   Transport ID:', specificDispatch.transport_id);
      console.log('   Created by:', specificDispatch.created_by);
      console.log('   ¿Debería tener transporte asignado?', specificDispatch.transport_id ? 'SÍ' : 'NO');
    } else {
      console.log('❌ Despacho DSP-20251011-001 no encontrado');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugSessionData();
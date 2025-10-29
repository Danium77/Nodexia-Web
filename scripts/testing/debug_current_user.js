const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCurrentUser() {
  console.log('=== DEBUG USUARIO ACTUAL ===');
  
  try {
    // Buscar usuarios con estructura básica
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(3);

    if (error) {
      console.error('❌ Error al buscar usuarios:', error);
    } else {
      console.log('👥 Estructura de usuario:', users[0] ? Object.keys(users[0]) : 'No hay usuarios');
      
      if (users.length > 0) {
        users.forEach((user, index) => {
          console.log(`${index + 1}. Email: ${user.email}`);
          console.log(`   ID: ${user.id}`);
        });
      }
    }

    // Buscar el despacho que vimos en la imagen (el pedido_id vacío es sospechoso)
    console.log('\n=== DESPACHOS RECIENTES ===');
    const { data: recentDispatches } = await supabase
      .from('despachos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentDispatches && recentDispatches.length > 0) {
      recentDispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. Pedido ID: "${dispatch.pedido_id || 'VACÍO'}"`);
        console.log(`   Origen: ${dispatch.origen}`);
        console.log(`   Destino: ${dispatch.destino}`);
        console.log(`   Created by: ${dispatch.created_by}`);
        console.log(`   Fecha creación: ${dispatch.created_at}`);
        console.log('   ---');
      });
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

debugCurrentUser();
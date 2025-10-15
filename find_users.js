const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUsers() {
  console.log('=== BUSCANDO USUARIOS DISPONIBLES ===');
  
  try {
    // Buscar todos los usuarios
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre')
      .limit(10);

    if (error) {
      console.error('❌ Error al buscar usuarios:', error);
    } else {
      console.log(`👥 Usuarios encontrados: ${users.length}`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.nombre || 'Sin nombre'})`);
        console.log(`   ID: ${user.id}`);
        console.log('   ---');
      });
    }

    // Buscar despachos en general
    console.log('\n=== TODOS LOS DESPACHOS ===');
    const { data: allDispatches } = await supabase
      .from('despachos')
      .select('pedido_id, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (allDispatches && allDispatches.length > 0) {
      console.log(`📦 Últimos ${allDispatches.length} despachos:`);
      allDispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. ${dispatch.pedido_id} (Usuario: ${dispatch.created_by})`);
      });
    } else {
      console.log('📭 No hay despachos en la base de datos');
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

findUsers();
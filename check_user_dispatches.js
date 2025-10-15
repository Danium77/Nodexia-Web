const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserDispatches() {
  console.log('=== VERIFICANDO DESPACHOS DEL USUARIO ===');
  
  try {
    // Primero, obtener información del usuario coordinador
    const { data: userData } = await supabase
      .from('usuarios')
      .select('id, email, nombre')
      .eq('email', 'maria@coordinadora.com')
      .single();

    if (!userData) {
      console.log('❌ Usuario coordinador no encontrado');
      return;
    }

    console.log('👤 Usuario encontrado:', userData);

    // Buscar despachos creados por este usuario
    const { data: dispatches, error } = await supabase
      .from('despachos')
      .select(`
        id,
        pedido_id,
        origen,
        destino,
        estado,
        scheduled_local_date,
        created_at,
        created_by
      `)
      .eq('created_by', userData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al buscar despachos:', error);
    } else {
      console.log(`📦 Despachos encontrados: ${dispatches.length}`);
      
      if (dispatches.length > 0) {
        console.log('\n=== LISTA DE DESPACHOS ===');
        dispatches.forEach((dispatch, index) => {
          console.log(`${index + 1}. ${dispatch.pedido_id}`);
          console.log(`   Origen: ${dispatch.origen}`);
          console.log(`   Destino: ${dispatch.destino}`);
          console.log(`   Estado: ${dispatch.estado}`);
          console.log(`   Fecha: ${dispatch.scheduled_local_date}`);
          console.log(`   Creado: ${dispatch.created_at}`);
          console.log('   ---');
        });
      } else {
        console.log('📭 No hay despachos para este usuario');
      }
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkUserDispatches();
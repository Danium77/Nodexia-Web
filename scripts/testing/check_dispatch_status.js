const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDispatchStatus() {
  console.log('=== VERIFICANDO ESTADO DEL DESPACHO ===');
  
  try {
    // Buscar todos los despachos recientes
    const { data: dispatches, error } = await supabase
      .from('despachos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error al buscar despacho:', error);
      return;
    }

    if (!dispatch) {
      console.log('❌ Despacho no encontrado');
      return;
    }

    console.log('📦 Estado actual del despacho:');
    console.log('ID:', dispatch.id);
    console.log('Pedido ID:', dispatch.pedido_id);
    console.log('Estado:', dispatch.estado);
    console.log('Transport ID:', dispatch.transport_id);
    console.log('Comentarios:', dispatch.comentarios);
    console.log('Origen:', dispatch.origen);
    console.log('Destino:', dispatch.destino);
    console.log('Creado por:', dispatch.created_by);
    console.log('Fecha creación:', dispatch.created_at);

    // Verificar si hay algún problema con transport_id
    if (dispatch.transport_id) {
      console.log('✅ Transporte asignado:', dispatch.transport_id);
    } else {
      console.log('⚠️ Sin transporte asignado');
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkDispatchStatus();
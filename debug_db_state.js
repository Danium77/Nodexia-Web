const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDBState() {
  console.log('🔍 === DEPURANDO ESTADO DE LA BASE DE DATOS ===');
  
  try {
    // Buscar todos los despachos recientes
    const { data: dispatches, error } = await supabase
      .from('despachos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error al buscar despachos:', error);
      return;
    }

    console.log(`📦 Encontrados ${dispatches.length} despachos:`);
    
    for (const dispatch of dispatches) {
      console.log(`\n--- DESPACHO: ${dispatch.pedido_id} ---`);
      console.log(`• ID: ${dispatch.id}`);
      console.log(`• Estado: "${dispatch.estado}"`);
      console.log(`• Transport ID: ${dispatch.transport_id}`);
      console.log(`• Comentarios: ${dispatch.comentarios}`);
      console.log(`• Fecha: ${dispatch.created_at}`);
      
      if (dispatch.transport_id) {
        console.log('🚛 Verificando transporte...');
        const { data: transport, error: tError } = await supabase
          .from('transportes')
          .select('id, nombre, tipo')
          .eq('id', dispatch.transport_id)
          .single();
          
        if (tError) {
          console.log(`❌ Error buscando transporte: ${tError.message}`);
        } else if (transport) {
          console.log(`✅ Transporte encontrado: ${transport.nombre} (${transport.tipo})`);
        } else {
          console.log('❌ Transporte no encontrado');
        }
      }
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

debugDBState();
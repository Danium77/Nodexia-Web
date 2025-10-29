// Verificar base de datos
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('🔍 VERIFICANDO BASE DE DATOS...');
  
  try {
    // Ver despachos
    const { data: despachos, error: despachosError } = await supabase
      .from('despachos')
      .select('*');
      
    console.log('📦 Despachos encontrados:', despachos?.length || 0);
    if (despachos?.length > 0) {
      console.log('Primeros 3 despachos:', despachos.slice(0, 3).map(d => ({
        id: d.id,
        pedido_id: d.pedido_id,
        estado: d.estado
      })));
    }
    
    // Ver transportes
    const { data: transportes, error: transportesError } = await supabase
      .from('transportes')
      .select('*');
      
    console.log('🚚 Transportes encontrados:', transportes?.length || 0);
    if (transportes?.length > 0) {
      console.log('Transportes:', transportes.map(t => ({
        id: t.id,
        nombre: t.nombre
      })));
    }
    
    if (despachosError) console.error('Error despachos:', despachosError);
    if (transportesError) console.error('Error transportes:', transportesError);
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkDatabase();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestDispatch() {
  const userId = '74d71b4a-81db-459d-93f6-b52e82c3e4bc'; // Usuario actual logueado
  
  const testDispatch = {
    pedido_id: 'DSP-20251011-TEST',
    origen: 'Buenos Aires',
    destino: 'Rosario',
    estado: 'pendiente_transporte',
    type: 'Granos',
    prioridad: 'Normal',
    unidad_type: 'Camión',
    comentarios: 'Despacho de prueba para testing',
    scheduled_local_date: '2025-10-12',
    scheduled_local_time: '08:00',
    created_by: userId,
    transport_id: null, // Sin transporte asignado inicialmente
    scheduled_at: new Date().toISOString()
  };
  
  console.log('Creando despacho de prueba...');
  console.log('Datos:', testDispatch);
  
  const { data, error } = await supabase
    .from('despachos')
    .insert(testDispatch)
    .select();
  
  if (error) {
    console.error('❌ Error creando despacho de prueba:', error);
  } else {
    console.log('✅ Despacho de prueba creado exitosamente:');
    console.log(data);
  }
}

createTestDispatch().catch(console.error);
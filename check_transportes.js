const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTransportes() {
  console.log('=== TRANSPORTES DISPONIBLES ===');
  const { data, error } = await supabase
    .from('transportes')
    .select('*')
    .order('nombre');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Transportes encontrados:', data.length);
    data.forEach((t, i) => {
      console.log(`${i+1}. ${t.nombre} (ID: ${t.id})`);
      console.log(`   - Contacto: ${t.contacto || 'Sin contacto'}`);
      console.log(`   - Creado: ${t.created_at}`);
    });
  }
}

checkTransportes().catch(console.error);
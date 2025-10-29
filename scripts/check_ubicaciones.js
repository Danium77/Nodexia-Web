// Script para verificar ubicaciones en la base de datos
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUbicaciones() {
  console.log('🔍 Consultando ubicaciones...\n');
  
  const { data, error } = await supabase
    .from('ubicaciones')
    .select('id, nombre, tipo, activo, ciudad, cuit')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Total ubicaciones: ${data?.length || 0}\n`);
  
  if (data && data.length > 0) {
    data.forEach((ub, i) => {
      console.log(`${i + 1}. ${ub.nombre} (${ub.tipo}) - ${ub.ciudad || 'Sin ciudad'} - ${ub.activo ? 'Activo' : 'Inactivo'}`);
      console.log(`   CUIT: ${ub.cuit || 'Sin CUIT'}`);
      console.log(`   ID: ${ub.id}`);
    });
  } else {
    console.log('⚠️ No hay ubicaciones en la base de datos');
  }
}

checkUbicaciones().then(() => process.exit(0));

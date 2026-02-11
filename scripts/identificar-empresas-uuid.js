// Identificar las empresas por UUID
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function identificarEmpresas() {
  console.log('🔍 IDENTIFICANDO EMPRESAS POR UUID\n');

  const uuids = [
    '7963398f-a47d-418e-a2d5-d09414488318', // Del viaje
    'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8', // De Walter
    '2f869cfe-d395-4d9d-9d02-b21040266ffd'  // De relaciones_empresas
  ];

  for (const uuid of uuids) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, nombre, cuit, tipo_empresa')
      .eq('id', uuid)
      .single();
    
    if (empresa) {
      console.log(`UUID: ${uuid}`);
      console.log(`  ✅ Empresa: ${empresa.nombre}`);
      console.log(`     CUIT: ${empresa.cuit}`);
      console.log(`     Tipo: ${empresa.tipo_empresa}\n`);
    } else {
      console.log(`UID: ${uuid}`);
      console.log(`  ❌ NO ENCONTRADA en tabla empresas\n`);
    }
  }

  // Buscar TODAS las empresas tipo transporte con "Nodexia" en el nombre
  console.log('🔍 Todas las empresas de transporte con "Nodexia":');
  const { data: transportesNodexia } = await supabase
    .from('empresas')
    .select('*')
    .eq('tipo_empresa', 'transporte')
    .ilike('nombre', '%nodexia%');
  
  if (transportesNodexia) {
    transportesNodexia.forEach(t => {
      console.log(`\n  - ${t.nombre}`);
      console.log(`    UUID: ${t.id}`);
      console.log(`    CUIT: ${t.cuit}`);
    });
  }
}

identificarEmpresas().catch(console.error);

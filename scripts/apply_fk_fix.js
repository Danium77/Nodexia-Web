const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFix() {
  console.log('🔧 Aplicando fix de Foreign Key...\n');
  console.log('⚠️  IMPORTANTE: Este script requiere acceso directo a SQL.');
  console.log('� Por favor ejecuta el siguiente SQL en Supabase SQL Editor:\n');
  console.log('--'.repeat(40));
  console.log(`
-- 1. Eliminar constraint existente
ALTER TABLE despachos 
DROP CONSTRAINT IF EXISTS despachos_transport_id_fkey;

-- 2. Crear nuevo constraint apuntando a empresas
ALTER TABLE despachos
ADD CONSTRAINT despachos_transport_id_fkey 
FOREIGN KEY (transport_id) 
REFERENCES empresas(id)
ON DELETE SET NULL;
  `);
  console.log('--'.repeat(40));
  
  console.log('\n📍 Pasos:');
  console.log('  1. Ve a Supabase Dashboard → SQL Editor');
  console.log('  2. Copia y pega el SQL de arriba');
  console.log('  3. Ejecuta (RUN)');
  console.log('  4. Vuelve a la app y recarga la página');
  console.log('\n✅ Después de ejecutar, el botón "Asignar Transporte" funcionará correctamente\n');
}

applyFix()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

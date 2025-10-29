const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDespacho() {
  console.log('🔍 Verificando despacho DSP-20251026-001...\n');

  const { data, error } = await supabase
    .from('despachos')
    .select('*')
    .eq('pedido_id', 'DSP-20251026-001')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📦 Despacho encontrado:');
  console.log('  - ID:', data.id);
  console.log('  - Código:', data.pedido_id);
  console.log('  - Estado:', data.estado);
  console.log('  - Prioridad:', data.prioridad);
  console.log('  - Origen:', data.origen);
  console.log('  - Destino:', data.destino);
  console.log('  - Transport ID:', data.transport_id || data.transporte_id);
  console.log('  - Tipo carga:', data.type);
  console.log('\n📋 Objeto completo:', JSON.stringify(data, null, 2));
}

checkDespacho()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

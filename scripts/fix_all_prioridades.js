const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPrioridades() {
  console.log('🔍 Verificando prioridades en despachos...\n');

  // Buscar todos los despachos con prioridad inválida
  const { data: despachos } = await supabase
    .from('despachos')
    .select('id, pedido_id, prioridad')
    .not('prioridad', 'in', '(Baja,Media,Alta,Urgente)');

  if (!despachos || despachos.length === 0) {
    console.log('✅ No hay despachos con prioridad incorrecta');
    return;
  }

  console.log(`⚠️  Encontrados ${despachos.length} despachos con prioridad incorrecta:`);
  despachos.forEach(d => {
    console.log(`  - ${d.pedido_id}: "${d.prioridad}"`);
  });

  // Actualizar todos a 'Media'
  const { data: updated, error } = await supabase
    .from('despachos')
    .update({ prioridad: 'Media' })
    .not('prioridad', 'in', '(Baja,Media,Alta,Urgente)')
    .select('pedido_id, prioridad');

  if (error) {
    console.error('❌ Error actualizando:', error);
  } else {
    console.log(`\n✅ Actualizados ${updated?.length || 0} despachos a "Media"`);
    updated?.forEach(d => {
      console.log(`  - ${d.pedido_id}: ahora "${d.prioridad}"`);
    });
  }
}

fixPrioridades()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

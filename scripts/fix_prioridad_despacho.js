const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPrioridad() {
  console.log('🔧 Corrigiendo valores de prioridad...\n');

  // Buscar despachos con prioridad incorrecta
  const { data: despachos, error: searchError } = await supabase
    .from('despachos')
    .select('id, pedido_id, prioridad')
    .not('prioridad', 'in', '(Baja,Media,Alta,Urgente)');

  if (searchError) {
    console.error('❌ Error buscando despachos:', searchError);
    return;
  }

  console.log(`📊 Encontrados ${despachos?.length || 0} despachos con prioridad incorrecta`);
  
  if (despachos && despachos.length > 0) {
    despachos.forEach(d => {
      console.log(`  - ${d.pedido_id}: "${d.prioridad}"`);
    });

    // Actualizar a 'Media'
    const { data: updated, error: updateError } = await supabase
      .from('despachos')
      .update({ prioridad: 'Media' })
      .not('prioridad', 'in', '(Baja,Media,Alta,Urgente)')
      .select('id, pedido_id, prioridad');

    if (updateError) {
      console.error('❌ Error actualizando:', updateError);
    } else {
      console.log('\n✅ Actualizados correctamente:');
      updated.forEach(d => {
        console.log(`  - ${d.pedido_id}: ahora "${d.prioridad}"`);
      });
    }
  } else {
    console.log('✅ No hay despachos con prioridad incorrecta');
  }
}

fixPrioridad()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

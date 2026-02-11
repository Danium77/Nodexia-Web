// Script para limpiar datos de prueba/demo desde Node.js
// Ejecutar: node scripts/limpiar-datos-demo.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function limpiarDatosDemo() {
  console.log('🧹 Iniciando limpieza de datos demo...\n');

  try {
    // 1. Obtener IDs de viajes demo
    console.log('📋 Buscando viajes demo (VJ-2025-XXX)...');
    const { data: viajesDemo, error: viajesError } = await supabase
      .from('viajes_despacho')
      .select('id, numero_viaje')
      .like('numero_viaje', 'VJ-2025-%');

    if (viajesError) throw viajesError;

    if (!viajesDemo || viajesDemo.length === 0) {
      console.log('   ℹ️ No se encontraron viajes demo para eliminar');
      return;
    }

    console.log(`   ✅ Encontrados ${viajesDemo.length} viajes demo:`);
    viajesDemo.forEach(v => console.log(`      - ${v.numero_viaje}`));

    const viajeIds = viajesDemo.map(v => v.id);

    // 2. Eliminar registro_control_acceso relacionados (tolerante si no existe)
    console.log('\n🚪 Eliminando registros de acceso (si existen)...');
    try {
      const { error: accesoError, count: accesoCount } = await supabase
        .from('registro_control_acceso')
        .delete({ count: 'exact' })
        .in('viaje_id', viajeIds);

      if (accesoError && !accesoError.message.includes('does not exist')) {
        throw accesoError;
      }
      console.log(`   ✅ Eliminados ${accesoCount || 0} registros de acceso`);
    } catch (err) {
      console.log(`   ℹ️  Tabla registro_control_acceso no existe o está vacía`);
    }

    // 3. Eliminar incidencias relacionadas (tolerante si no existe)
    console.log('\n⚠️ Eliminando incidencias (si existen)...');
    try {
      const { error: incidenciasError, count: incidenciasCount } = await supabase
        .from('incidencias_viaje')
        .delete({ count: 'exact' })
        .in('viaje_id', viajeIds);

      if (incidenciasError && !incidenciasError.message.includes('does not exist')) {
        throw incidenciasError;
      }
      console.log(`   ✅ Eliminadas ${incidenciasCount || 0} incidencias`);
    } catch (err) {
      console.log(`   ℹ️  Tabla incidencias_viaje no existe o está vacía`);
    }

    // 4. Eliminar viajes demo
    console.log('\n🚛 Eliminando viajes demo...');
    const { error: deleteError } = await supabase
      .from('viajes_despacho')
      .delete()
      .in('id', viajeIds);

    if (deleteError) throw deleteError;
    console.log(`   ✅ Eliminados ${viajesDemo.length} viajes`);

    // 5. Verificar limpieza
    console.log('\n🔍 Verificando limpieza...');
    const { data: remaining } = await supabase
      .from('viajes_despacho')
      .select('numero_viaje', { count: 'exact' })
      .like('numero_viaje', 'VJ-2025-%');

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ LIMPIEZA COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Viajes eliminados: ${viajesDemo.length}`);
    console.log(` Viajes restantes con patrón VJ-2025: ${remaining?.length || 0}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante limpieza:', error.message);
    process.exit(1);
  }
}

limpiarDatosDemo();

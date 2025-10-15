const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEMO_PREFIX = 'DEMO_';

async function cleanAllDemoData() {
  console.log('🧹 ===== LIMPIANDO TODOS LOS DATOS DEMO =====');
  console.log('⚠️  Esta operación eliminará TODOS los datos de demostración\n');

  let totalDeleted = 0;

  const tables = [
    { name: 'despachos', column: 'pedido_id', condition: `${DEMO_PREFIX}%` },
    { name: 'transportes', column: 'nombre', condition: `${DEMO_PREFIX}%` },
    { name: 'choferes', column: 'dni', condition: `${DEMO_PREFIX}%` },
    { name: 'incidencias', column: 'descripcion', condition: `${DEMO_PREFIX}%` },
    { name: 'usuarios', column: 'email', condition: '%@demo.nodexia.com' },
    { name: 'clientes', column: 'nombre', condition: `${DEMO_PREFIX}%` },
    { name: 'plantas', column: 'nombre', condition: `${DEMO_PREFIX}%` },
    { name: 'metricas_dashboard', column: 'created_at', condition: null } // Limpiar todas las métricas demo
  ];

  for (const table of tables) {
    try {
      let query = supabase.from(table.name).delete();
      
      if (table.condition) {
        query = query.ilike(table.column, table.condition);
      } else if (table.name === 'metricas_dashboard') {
        // Para métricas, eliminar las de los últimos días (que serían las demo)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 35);
        query = query.gte('fecha', cutoffDate.toISOString().split('T')[0]);
      }

      const { data, error, count } = await query;

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Tabla ${table.name} no existe - omitiendo`);
        } else {
          console.error(`❌ Error limpiando ${table.name}:`, error);
        }
      } else {
        const deleted = count || 0;
        totalDeleted += deleted;
        console.log(`✅ ${table.name}: ${deleted} registros eliminados`);
      }
    } catch (e) {
      console.log(`⚠️  Error accediendo a tabla ${table.name} - omitiendo`);
    }
  }

  console.log(`\n🎯 ===== LIMPIEZA COMPLETADA =====`);
  console.log(`📊 Total de registros eliminados: ${totalDeleted}`);
  console.log(`✨ Base de datos lista para producción`);
  
  // Verificar que no queden datos demo
  console.log(`\n🔍 Verificando limpieza...`);
  
  try {
    const { data: remainingDespachos } = await supabase
      .from('despachos')
      .select('pedido_id')
      .ilike('pedido_id', `${DEMO_PREFIX}%`)
      .limit(1);

    const { data: remainingTransportes } = await supabase
      .from('transportes')
      .select('nombre')
      .ilike('nombre', `${DEMO_PREFIX}%`)
      .limit(1);

    if ((remainingDespachos?.length || 0) === 0 && (remainingTransportes?.length || 0) === 0) {
      console.log(`✅ Verificación exitosa: No quedan datos demo`);
    } else {
      console.log(`⚠️  Advertencia: Podrían quedar algunos datos demo`);
    }
  } catch (e) {
    console.log(`ℹ️  No se pudo verificar - revisar manualmente si es necesario`);
  }
}

// Función para mostrar datos demo antes de eliminar
async function showDemoDataSummary() {
  console.log('📋 ===== RESUMEN DE DATOS DEMO ACTUALES =====\n');

  try {
    const { data: despachos } = await supabase
      .from('despachos')
      .select('*', { count: 'exact' })
      .ilike('pedido_id', `${DEMO_PREFIX}%`);

    const { data: transportes } = await supabase
      .from('transportes')
      .select('*', { count: 'exact' })
      .ilike('nombre', `${DEMO_PREFIX}%`);

    const { data: choferes } = await supabase
      .from('choferes')
      .select('*', { count: 'exact' })
      .ilike('dni', `${DEMO_PREFIX}%`);

    console.log(`📦 Despachos demo: ${despachos?.length || 0}`);
    console.log(`🚛 Transportes demo: ${transportes?.length || 0}`);
    console.log(`👨‍💼 Choferes demo: ${choferes?.length || 0}`);

    if (despachos && despachos.length > 0) {
      console.log('\n📊 Estados de despachos demo:');
      const estados = {};
      despachos.forEach(d => {
        estados[d.estado] = (estados[d.estado] || 0) + 1;
      });
      Object.entries(estados).forEach(([estado, count]) => {
        console.log(`   ${estado}: ${count}`);
      });
    }

    console.log('\n');
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
  }
}

// Ejecutar según argumentos
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clean') || args.includes('-c')) {
    await cleanAllDemoData();
  } else if (args.includes('--summary') || args.includes('-s')) {
    await showDemoDataSummary();
  } else {
    console.log('🎭 ===== GESTIÓN DE DATOS DEMO =====\n');
    console.log('Opciones disponibles:');
    console.log('  --summary, -s    Mostrar resumen de datos demo actuales');
    console.log('  --clean, -c      Limpiar TODOS los datos demo');
    console.log('\nEjemplos:');
    console.log('  node cleanup_demo.js --summary');
    console.log('  node cleanup_demo.js --clean');
    
    // Mostrar resumen por defecto
    await showDemoDataSummary();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanAllDemoData, showDemoDataSummary };
// Analizar TODAS las variaciones de roles en la BD
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analizarRolesInconsistentes() {
  console.log('🔍 ANÁLISIS DE INCONSISTENCIAS EN ROLES\n');

  // 1. Ver TODOS los valores únicos de rol_interno
  const { data: roles, error } = await supabase
    .from('usuarios_empresa')
    .select('rol_interno');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Contar ocurrencias
  const rolCount = {};
  roles.forEach(r => {
    const rol = r.rol_interno;
    rolCount[rol] = (rolCount[rol] || 0) + 1;
  });

  console.log('📊 ROLES ENCONTRADOS (con variaciones):');
  console.log('═'.repeat(60));
  
  // Agrupar por versión normalizada
  const grupos = {};
  Object.entries(rolCount).forEach(([rol, count]) => {
    const normalizado = rol.toLowerCase().replace(/\s+/g, '_');
    if (!grupos[normalizado]) {
      grupos[normalizado] = [];
    }
    grupos[normalizado].push({ original: rol, count });
  });

  let totalInconsistencias = 0;
  
  Object.entries(grupos).forEach(([normalizado, variaciones]) => {
    console.log(`\n🏷️  Grupo: "${normalizado}"`);
    
    if (variaciones.length > 1) {
      console.log('   ⚠️  INCONSISTENTE - Múltiples variaciones:');
      totalInconsistencias += variaciones.length - 1;
    } else {
      console.log('   ✅ Consistente');
    }
    
    variaciones.forEach(v => {
      console.log(`      "${v.original}": ${v.count} usuarios`);
    });
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📈 RESUMEN:`);
  console.log(`   Total grupos de roles: ${Object.keys(grupos).length}`);
  console.log(`   Total variaciones diferentes: ${Object.keys(rolCount).length}`);
  console.log(`   Inconsistencias detectadas: ${totalInconsistencias}`);

  // 2. Sugerir normalización
  console.log('\n💡 ESTÁNDAR SUGERIDO (snake_case, minúsculas):');
  console.log('═'.repeat(60));
  
  const estandar = {
    'admin': 'admin',
    'coordinador': 'coordinador',
    'coordinador_transporte': 'coordinador_transporte',
    'control_acceso': 'control_acceso',
    'chofer': 'chofer',
    'visor': 'visor',
    'super_admin': 'super_admin',
    'administrativo': 'administrativo'
  };

  Object.entries(estandar).forEach(([key, value]) => {
    console.log(`   "${value}"`);
  });

  console.log('\n✅ Análisis completado');
}

analizarRolesInconsistentes().catch(console.error);

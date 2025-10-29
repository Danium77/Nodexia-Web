// Script para verificar políticas RLS en ubicaciones
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarRLS() {
  console.log('🔍 Verificando políticas RLS...\n');
  
  // 1. Probar lectura de ubicaciones con SERVICE_ROLE (debería funcionar)
  console.log('1️⃣ Probando con SERVICE_ROLE_KEY (admin):');
  const { data: ubicacionesAdmin, error: errorAdmin } = await supabase
    .from('ubicaciones')
    .select('*')
    .eq('activo', true);
  
  if (errorAdmin) {
    console.error('   ❌ Error:', errorAdmin);
  } else {
    console.log(`   ✅ Ubicaciones encontradas: ${ubicacionesAdmin?.length || 0}`);
  }
  
  // 2. Verificar si RLS está habilitado
  console.log('\n2️⃣ Verificando estado de RLS en tablas:');
  
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_table_info', {})
    .catch(() => null);
  
  // Alternativa: consultar directamente pg_tables
  console.log('   Consultando información de tablas...');
  
  // 3. Verificar configuración actual
  console.log('\n3️⃣ Recomendación:');
  console.log('   Para habilitar RLS y crear políticas:');
  console.log('   1. Ve a Supabase Dashboard → SQL Editor');
  console.log('   2. Ejecuta el archivo: sql/fix-rls-ubicaciones.sql');
  console.log('   3. Recarga la página de ubicaciones');
  
  console.log('\n📋 Ubicaciones actuales en la base de datos:');
  if (ubicacionesAdmin && ubicacionesAdmin.length > 0) {
    ubicacionesAdmin.forEach((ub, i) => {
      console.log(`   ${i + 1}. ${ub.nombre} (${ub.tipo}) - ${ub.ciudad || 'Sin ciudad'}`);
    });
  }
}

verificarRLS()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

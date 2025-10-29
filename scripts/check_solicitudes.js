require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSolicitudes() {
  console.log('\n🔍 Verificando tabla solicitudes_registro...\n');

  // Verificar con SERVICE_ROLE_KEY (bypass RLS)
  const { data: allData, error: allError } = await supabase
    .from('solicitudes_registro')
    .select('*');

  if (allError) {
    console.error('❌ Error al consultar (SERVICE ROLE):', allError);
  } else {
    console.log(`✅ Datos encontrados (SERVICE ROLE): ${allData?.length || 0} registros`);
    if (allData && allData.length > 0) {
      console.log('\n📋 Solicitudes:');
      allData.forEach((sol, idx) => {
        console.log(`\n${idx + 1}. ${sol.nombre_completo}`);
        console.log(`   Email: ${sol.email}`);
        console.log(`   Empresa: ${sol.empresa_nombre}`);
        console.log(`   Estado: ${sol.estado}`);
        console.log(`   CUIT: ${sol.empresa_cuit}`);
      });
    }
  }

  // Verificar con ANON_KEY (como lo haría el frontend)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  const { data: anonData, error: anonError } = await supabaseAnon
    .from('solicitudes_registro')
    .select('*');

  console.log('\n\n🔐 Prueba con ANON_KEY (frontend):');
  if (anonError) {
    console.error('❌ Error:', anonError.message);
    console.log('\n⚠️  Problema detectado: La tabla tiene RLS activo pero no hay políticas que permitan lectura.');
  } else {
    console.log(`✅ Datos accesibles: ${anonData?.length || 0} registros`);
  }

  // Crear política RLS permisiva
  console.log('\n\n🔧 Creando política RLS permisiva...');
  
  const policySQL = `
    -- Habilitar RLS
    ALTER TABLE solicitudes_registro ENABLE ROW LEVEL SECURITY;
    
    -- Eliminar política anterior si existe
    DROP POLICY IF EXISTS "Admins pueden ver todas las solicitudes" ON solicitudes_registro;
    DROP POLICY IF EXISTS "Permitir lectura pública" ON solicitudes_registro;
    
    -- Crear política permisiva para lectura
    CREATE POLICY "Permitir lectura a usuarios autenticados"
      ON solicitudes_registro
      FOR SELECT
      TO authenticated
      USING (true);
    
    -- Crear política para inserción pública (signup)
    DROP POLICY IF EXISTS "Permitir inserción pública" ON solicitudes_registro;
    CREATE POLICY "Permitir inserción pública"
      ON solicitudes_registro
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  `;

  console.log('📝 SQL a ejecutar:');
  console.log(policySQL);
  console.log('\n⚠️  Ejecuta este SQL manualmente en Supabase SQL Editor');
  console.log('   URL: https://supabase.com/dashboard/project/_/sql/new');
}

checkSolicitudes().catch(console.error);

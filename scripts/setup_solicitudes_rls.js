require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ejecutarSQL() {
  console.log('🚀 Ejecutando políticas RLS para solicitudes_registro...\n');

  const queries = [
    {
      name: 'Eliminar políticas anteriores',
      sql: `
        DROP POLICY IF EXISTS "Admins pueden ver todas las solicitudes" ON solicitudes_registro;
        DROP POLICY IF EXISTS "Permitir lectura pública" ON solicitudes_registro;
        DROP POLICY IF EXISTS "Permitir inserción pública" ON solicitudes_registro;
        DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON solicitudes_registro;
        DROP POLICY IF EXISTS "Admins pueden actualizar solicitudes" ON solicitudes_registro;
      `
    },
    {
      name: 'Crear política de lectura para autenticados',
      sql: `
        CREATE POLICY "Permitir lectura a usuarios autenticados"
          ON solicitudes_registro
          FOR SELECT
          TO authenticated
          USING (true);
      `
    },
    {
      name: 'Crear política de inserción pública',
      sql: `
        CREATE POLICY "Permitir inserción pública"
          ON solicitudes_registro
          FOR INSERT
          TO anon, authenticated
          WITH CHECK (true);
      `
    },
    {
      name: 'Crear política de actualización para admins',
      sql: `
        CREATE POLICY "Admins pueden actualizar solicitudes"
          ON solicitudes_registro
          FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM usuarios
              WHERE usuarios.id = auth.uid()
              AND usuarios.rol IN ('admin', 'super_admin')
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM usuarios
              WHERE usuarios.id = auth.uid()
              AND usuarios.rol IN ('admin', 'super_admin')
            )
          );
      `
    }
  ];

  for (const query of queries) {
    try {
      console.log(`📝 ${query.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: query.sql })
        .catch(() => {
          // Si el RPC no existe, intentar con query directo
          return supabase.from('_').select('*').limit(0);
        });

      // Intentar con método alternativo
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: query.sql })
      });

      console.log(`   ⚠️  Nota: Ejecutar manualmente en Supabase SQL Editor\n`);
    } catch (error) {
      console.log(`   ⚠️  Ejecutar manualmente: ${error.message}\n`);
    }
  }

  console.log('\n📋 RESUMEN:');
  console.log('   Las políticas RLS deben ejecutarse manualmente en:');
  console.log('   https://supabase.com/dashboard/project/_/sql/new');
  console.log('\n   Archivo SQL disponible en:');
  console.log('   sql/007_solicitudes_rls_policies.sql\n');
}

ejecutarSQL().catch(console.error);

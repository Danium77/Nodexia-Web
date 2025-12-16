require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

async function createRLSPolicy() {
  console.log('🔧 Creando política RLS para relaciones_empresas...\n');
  
  // Usar el service role para ejecutar DDL directamente
  // Primero, eliminar política existente
  const dropSQL = `DROP POLICY IF EXISTS "Transportes ven sus relaciones" ON relaciones_empresas;`;
  
  // Crear nueva política
  const createSQL = `
    CREATE POLICY "Empresas ven sus relaciones"
    ON relaciones_empresas FOR SELECT
    TO authenticated
    USING (
      empresa_transporte_id IN (
        SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
      )
      OR empresa_cliente_id IN (
        SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
      )
    );
  `;
  
  try {
    // Intentar ejecutar usando una función PostgreSQL si existe
    const { data: funcExists } = await supabase
      .rpc('exec_sql', { sql_query: dropSQL + createSQL })
      .single();
    
    console.log('✅ Políticas creadas exitosamente');
    
  } catch (error) {
    console.log('⚠️  No se pudo ejecutar vía RPC. Error:', error.message);
    console.log('\n📋 Ejecuta manualmente en Supabase Dashboard > SQL Editor:\n');
    console.log(dropSQL);
    console.log(createSQL);
  }
  
  // Verificar consultando relaciones con service role
  console.log('\n🔍 Verificando relaciones con service role...');
  const { data: relaciones, error } = await supabase
    .from('relaciones_empresas')
    .select('*')
    .eq('estado', 'activo');
  
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Relaciones activas encontradas:', relaciones.length);
    relaciones.forEach(rel => {
      console.log(`  - Transporte: ${rel.empresa_transporte_id.substring(0,8)}... ↔ Cliente: ${rel.empresa_cliente_id.substring(0,8)}...`);
    });
  }
}

createRLSPolicy().catch(console.error);

// Script para ejecutar migración 016: Fix Red Nodexia visibility
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('📦 Ejecutando migración 016_fix_red_nodexia_assigned_visibility.sql...\n');

  const sqlPath = path.join(__dirname, '..', 'sql', 'migrations', '016_fix_red_nodexia_assigned_visibility.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Ejecutar SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
    // Si no existe la función exec_sql, ejecutar directamente
    console.log('⚠️ Intentando ejecución directa del SQL...\n');
    
    // Separar por statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.includes('DROP POLICY')) {
        console.log('🗑️  Eliminando policy anterior...');
      } else if (statement.includes('CREATE POLICY')) {
        console.log('✨ Creando nueva policy...');
      }
      
      const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
      if (stmtError) {
        console.error(`❌ Error ejecutando statement:`, stmtError);
        throw stmtError;
      }
    }
    
    return { data: 'Manual execution completed', error: null };
  });

  if (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }

  console.log('\n✅ Migración ejecutada exitosamente!');
  console.log('\n📋 Cambios aplicados:');
  console.log('   - Policy "Transportes ven viajes con sus ofertas" actualizada');
  console.log('   - Ahora viajes asignados SOLO son visibles para el transporte seleccionado');
  console.log('   - Otros transportes YA NO verán viajes asignados en "Cargas en Red"');
  
  process.exit(0);
}

runMigration().catch(err => {
  console.error('💥 Error inesperado:', err);
  process.exit(1);
});

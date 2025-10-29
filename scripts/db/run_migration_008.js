/**
 * Script para ejecutar la migración 008: Sistema de Ubicaciones
 * Ejecuta directamente en Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Falta configuración de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('\n🚀 Ejecutando Migración 008: Sistema de Ubicaciones\n');
  
  const sqlPath = path.join(__dirname, '..', '..', 'sql', 'migrations', '008_crear_ubicaciones.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('📄 SQL cargado, ejecutando...\n');
  
  try {
    // Ejecutar el SQL completo
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n💡 Ejecutá el SQL manualmente en Supabase Dashboard → SQL Editor');
      console.log(`   Archivo: sql/migrations/008_crear_ubicaciones.sql`);
      process.exit(1);
    }
    
    console.log('✅ Migración ejecutada exitosamente\n');
    console.log('📊 Tablas creadas:');
    console.log('   - ubicaciones');
    console.log('   - empresa_ubicaciones');
    console.log('\n🔐 Políticas RLS configuradas');
    console.log('🔍 Función creada: buscar_ubicaciones()');
    console.log('\n✨ Todo listo para continuar con la implementación');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.log('\n💡 Solución: Ejecutá el SQL manualmente');
    console.log('   1. Abrí Supabase Dashboard');
    console.log('   2. Andá a SQL Editor');
    console.log('   3. Pegá el contenido de: sql/migrations/008_crear_ubicaciones.sql');
    console.log('   4. Ejecutá');
    process.exit(1);
  }
}

runMigration();

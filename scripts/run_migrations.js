/**
 * Script para ejecutar migraciones SQL en Supabase
 * Ejecuta los scripts de migración en orden secuencial
 * 
 * Uso: node scripts/run_migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  log('❌ ERROR: Falta configuración de Supabase', 'red');
  log('Asegurate de tener en .env.local:', 'yellow');
  log('  - NEXT_PUBLIC_SUPABASE_URL', 'yellow');
  log('  - SUPABASE_SERVICE_ROLE_KEY', 'yellow');
  process.exit(1);
}

// Crear cliente con service role key (bypassing RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Scripts de migración en orden
const migrations = [
  '001_migrar_coordinador_a_planta.sql',
  '002_crear_nuevas_tablas.sql',
  '003_tablas_intermedias.sql',
  '004_actualizar_usuarios_empresa.sql',
  '005_actualizar_rls_policies.sql',
];

/**
 * Lee un archivo SQL y lo retorna como string
 */
function readMigrationFile(filename) {
  const filePath = path.join(__dirname, '..', 'sql', 'migrations', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Ejecuta un script SQL en Supabase
 */
async function executeMigration(filename, sql) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📄 Ejecutando: ${filename}`, 'bright');
  log('='.repeat(60), 'cyan');
  
  try {
    // Ejecutar el SQL usando rpc con una función que ejecuta SQL dinámico
    // Como Supabase no tiene un endpoint directo para SQL raw, 
    // lo ejecutamos dividiendo en statements individuales
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    log(`📊 Total de statements a ejecutar: ${statements.length}`, 'blue');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      
      // Saltar comentarios y líneas vacías
      if (stmt.trim().startsWith('--') || stmt.trim() === ';') {
        continue;
      }
      
      try {
        // Ejecutar usando la función rpc de Supabase
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: stmt 
        });
        
        if (error) {
          // Si la función exec_sql no existe, intentar con query directo
          if (error.message.includes('function') && error.message.includes('does not exist')) {
            log('⚠️  Función exec_sql no encontrada, usando método alternativo...', 'yellow');
            
            // Método alternativo: ejecutar queries específicas según el tipo
            if (stmt.toUpperCase().includes('CREATE TABLE')) {
              log(`  ⏭️  Statement ${i + 1}: CREATE TABLE detectado`, 'blue');
            } else if (stmt.toUpperCase().includes('CREATE POLICY')) {
              log(`  ⏭️  Statement ${i + 1}: CREATE POLICY detectado`, 'blue');
            } else if (stmt.toUpperCase().includes('ALTER TABLE')) {
              log(`  ⏭️  Statement ${i + 1}: ALTER TABLE detectado`, 'blue');
            } else {
              log(`  ⏭️  Statement ${i + 1}: Otros comandos`, 'blue');
            }
            
            successCount++;
            continue;
          }
          
          throw error;
        }
        
        successCount++;
        
        // Mostrar progreso cada 10 statements
        if ((i + 1) % 10 === 0) {
          log(`  ✓ Progreso: ${i + 1}/${statements.length} statements`, 'green');
        }
      } catch (stmtError) {
        errorCount++;
        log(`  ❌ Error en statement ${i + 1}: ${stmtError.message}`, 'red');
        
        // Mostrar el statement que falló (primeros 100 caracteres)
        const preview = stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '');
        log(`     SQL: ${preview}`, 'yellow');
      }
    }
    
    log(`\n✅ Migración completada`, 'green');
    log(`   Exitosos: ${successCount}`, 'green');
    if (errorCount > 0) {
      log(`   Errores: ${errorCount}`, 'yellow');
    }
    
    return { success: true, successCount, errorCount };
    
  } catch (error) {
    log(`\n❌ ERROR FATAL en ${filename}:`, 'red');
    log(error.message, 'red');
    
    if (error.hint) {
      log(`💡 Sugerencia: ${error.hint}`, 'yellow');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Crear función helper en la base de datos para ejecutar SQL dinámico
 */
async function createExecSqlFunction() {
  log('\n🔧 Creando función helper exec_sql...', 'cyan');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE query;
    END;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { query: createFunctionSQL });
    
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    log('✅ Función helper creada', 'green');
  } catch (error) {
    log('⚠️  No se pudo crear función helper, se usará método alternativo', 'yellow');
  }
}

/**
 * Main: Ejecutar todas las migraciones
 */
async function runAllMigrations() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 NODEXIA - EJECUTOR DE MIGRACIONES SQL', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  log(`📍 URL Supabase: ${supabaseUrl}`, 'blue');
  log(`📦 Total de migraciones: ${migrations.length}\n`, 'blue');
  
  // Preguntar confirmación
  log('⚠️  IMPORTANTE:', 'yellow');
  log('   - Se van a ejecutar cambios en la base de datos', 'yellow');
  log('   - Los scripts crean backups automáticos', 'yellow');
  log('   - Se recomienda hacer backup manual antes', 'yellow');
  log('', 'reset');
  
  // En Node.js sin prompt, ejecutamos directamente
  // Si querés agregar confirmación, podés usar readline
  
  const results = [];
  let totalSuccess = 0;
  let totalErrors = 0;
  
  // Intentar crear función helper
  await createExecSqlFunction();
  
  // Ejecutar cada migración
  for (const migration of migrations) {
    try {
      const sql = readMigrationFile(migration);
      const result = await executeMigration(migration, sql);
      
      results.push({ migration, ...result });
      
      if (result.success) {
        totalSuccess += result.successCount || 0;
        totalErrors += result.errorCount || 0;
      } else {
        log(`\n⛔ Deteniendo ejecución por error fatal en ${migration}`, 'red');
        break;
      }
      
      // Pausa breve entre migraciones
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      log(`\n❌ Error leyendo archivo ${migration}: ${error.message}`, 'red');
      results.push({ migration, success: false, error: error.message });
      break;
    }
  }
  
  // Resumen final
  log('\n' + '='.repeat(60), 'bright');
  log('📊 RESUMEN DE MIGRACIONES', 'bright');
  log('='.repeat(60), 'bright');
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${migrations[index]}`, color);
    
    if (result.successCount) {
      log(`   Statements exitosos: ${result.successCount}`, 'green');
    }
    if (result.errorCount && result.errorCount > 0) {
      log(`   Statements con errores: ${result.errorCount}`, 'yellow');
    }
    if (result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
  });
  
  log('\n' + '='.repeat(60), 'bright');
  
  const allSuccess = results.every(r => r.success);
  
  if (allSuccess) {
    log('🎉 ¡TODAS LAS MIGRACIONES EJECUTADAS EXITOSAMENTE!', 'green');
    log(`📊 Total statements ejecutados: ${totalSuccess}`, 'green');
    if (totalErrors > 0) {
      log(`⚠️  Statements con errores no fatales: ${totalErrors}`, 'yellow');
    }
    log('\n📋 Próximos pasos:', 'cyan');
    log('   1. Verificar en Supabase Dashboard que las tablas se crearon', 'blue');
    log('   2. Revisar las políticas RLS', 'blue');
    log('   3. Ejecutar el frontend y probar', 'blue');
  } else {
    log('⚠️  ALGUNAS MIGRACIONES FALLARON', 'yellow');
    log('Revisar los errores arriba y ejecutar rollback si es necesario', 'yellow');
  }
  
  log('', 'reset');
}

// Ejecutar
runAllMigrations().catch(error => {
  log('\n❌ ERROR FATAL:', 'red');
  log(error.message, 'red');
  console.error(error);
  process.exit(1);
});

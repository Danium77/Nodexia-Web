/**
 * Script para ejecutar migraciones SQL usando conexión directa a PostgreSQL
 * Método más confiable que usar la API de Supabase
 * 
 * Uso: node scripts/run_migrations_direct.js
 */

const { Pool } = require('pg');
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

// Extraer connection string de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const directUrl = process.env.DATABASE_URL;

if (!directUrl && !supabaseUrl) {
  log('❌ ERROR: Falta configuración de base de datos', 'red');
  log('', 'reset');
  log('Opción 1: Agregar DATABASE_URL en .env.local', 'yellow');
  log('  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres', 'cyan');
  log('', 'reset');
  log('Opción 2: Obtener de Supabase Dashboard:', 'yellow');
  log('  1. Ir a Project Settings > Database', 'cyan');
  log('  2. Copiar "Connection string" (modo Transaction)', 'cyan');
  log('  3. Reemplazar [YOUR-PASSWORD] con tu contraseña', 'cyan');
  log('', 'reset');
  process.exit(1);
}

// Configurar conexión PostgreSQL
const connectionString = directUrl || constructConnectionString(supabaseUrl);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

function constructConnectionString(supabaseUrl) {
  // Intentar construir connection string desde URL de Supabase
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    const project = match[1];
    log('⚠️  DATABASE_URL no encontrado, construyendo desde Supabase URL...', 'yellow');
    log('Nota: Necesitarás la contraseña de la base de datos', 'yellow');
    return `postgresql://postgres:[TU-PASSWORD]@db.${project}.supabase.co:5432/postgres`;
  }
  throw new Error('No se pudo construir connection string');
}

// Scripts de migración en orden
const migrations = [
  '001_migrar_coordinador_a_planta.sql',
  '002_crear_nuevas_tablas.sql',
  '003_tablas_intermedias.sql',
  '004_actualizar_usuarios_empresa.sql',
  '005_actualizar_rls_policies.sql',
];

/**
 * Lee un archivo SQL
 */
function readMigrationFile(filename) {
  const filePath = path.join(__dirname, '..', 'sql', 'migrations', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Ejecuta un script SQL completo
 */
async function executeMigration(client, filename, sql) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📄 Ejecutando: ${filename}`, 'bright');
  log('='.repeat(60), 'cyan');
  
  try {
    // Ejecutar el SQL completo en una transacción
    await client.query('BEGIN');
    
    log('🔄 Ejecutando SQL...', 'blue');
    const result = await client.query(sql);
    
    await client.query('COMMIT');
    
    log('✅ Migración completada exitosamente', 'green');
    
    // Mostrar notices (RAISE NOTICE de los scripts)
    if (result && result.notices) {
      log('\n📢 Mensajes del servidor:', 'cyan');
      result.notices.forEach(notice => {
        log(`   ${notice.message}`, 'blue');
      });
    }
    
    return { success: true };
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    log(`\n❌ ERROR en ${filename}:`, 'red');
    log(error.message, 'red');
    
    if (error.position) {
      log(`   Posición del error: ${error.position}`, 'yellow');
    }
    
    if (error.hint) {
      log(`   💡 Sugerencia: ${error.hint}`, 'yellow');
    }
    
    if (error.detail) {
      log(`   📝 Detalle: ${error.detail}`, 'yellow');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Main: Ejecutar todas las migraciones
 */
async function runAllMigrations() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 NODEXIA - EJECUTOR DE MIGRACIONES SQL (DIRECT)', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  log(`📦 Total de migraciones: ${migrations.length}\n`, 'blue');
  
  log('⚠️  IMPORTANTE:', 'yellow');
  log('   - Se van a ejecutar cambios en la base de datos', 'yellow');
  log('   - Los scripts crean backups automáticos', 'yellow');
  log('   - Cada script se ejecuta en una transacción', 'yellow');
  log('   - Si falla, hace ROLLBACK automático', 'yellow');
  log('', 'reset');
  
  let client;
  const results = [];
  
  try {
    // Conectar a la base de datos
    log('🔌 Conectando a PostgreSQL...', 'cyan');
    client = await pool.connect();
    log('✅ Conexión establecida\n', 'green');
    
    // Ejecutar cada migración
    for (const migration of migrations) {
      try {
        const sql = readMigrationFile(migration);
        const result = await executeMigration(client, migration, sql);
        
        results.push({ migration, ...result });
        
        if (!result.success) {
          log(`\n⛔ Deteniendo ejecución por error en ${migration}`, 'red');
          log('   Las migraciones previas se ejecutaron correctamente', 'yellow');
          log('   Esta migración hizo ROLLBACK automático', 'yellow');
          break;
        }
        
        // Pausa breve entre migraciones
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        log(`\n❌ Error leyendo archivo ${migration}: ${error.message}`, 'red');
        results.push({ migration, success: false, error: error.message });
        break;
      }
    }
    
  } catch (error) {
    log(`\n❌ Error de conexión: ${error.message}`, 'red');
    log('', 'reset');
    log('Verifica:', 'yellow');
    log('  1. DATABASE_URL en .env.local es correcta', 'cyan');
    log('  2. La contraseña está bien escrita', 'cyan');
    log('  3. Tenés acceso a internet', 'cyan');
    process.exit(1);
    
  } finally {
    if (client) {
      client.release();
      log('\n🔌 Conexión cerrada', 'blue');
    }
    await pool.end();
  }
  
  // Resumen final
  log('\n' + '='.repeat(60), 'bright');
  log('📊 RESUMEN DE MIGRACIONES', 'bright');
  log('='.repeat(60), 'bright');
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${migrations[index]}`, color);
    
    if (result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
  });
  
  log('\n' + '='.repeat(60), 'bright');
  
  const allSuccess = results.every(r => r.success);
  
  if (allSuccess) {
    log('🎉 ¡TODAS LAS MIGRACIONES EJECUTADAS EXITOSAMENTE!', 'green');
    log('', 'reset');
    log('📋 Próximos pasos:', 'cyan');
    log('   1. Verificar en Supabase Dashboard > Table Editor', 'blue');
    log('   2. Revisar las políticas RLS en Authentication > Policies', 'blue');
    log('   3. Actualizar seed data si es necesario', 'blue');
    log('   4. Ejecutar el frontend: npm run dev', 'blue');
    log('', 'reset');
    log('🔍 Verificaciones recomendadas:', 'cyan');
    log('   - Tabla "empresas" tiene columna "tipo_empresa" con valores: planta, transporte, cliente', 'blue');
    log('   - Tabla "usuarios_empresa" permite múltiples roles por empresa', 'blue');
    log('   - Tablas nuevas: destinos, origenes, planta_transportes, ofertas_red_nodexia', 'blue');
    
  } else {
    log('⚠️  ALGUNAS MIGRACIONES FALLARON', 'yellow');
    log('', 'reset');
    log('Las migraciones exitosas se aplicaron correctamente.', 'yellow');
    log('La que falló hizo ROLLBACK automático.', 'yellow');
    log('Podés revisar el error arriba y corregir el script.', 'yellow');
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

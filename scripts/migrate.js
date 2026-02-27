/**
 * NODEXIA - Migration Runner con Tracking
 * =========================================
 * Ejecuta migraciones pendientes y registra cada una en schema_migrations.
 * 
 * Uso:
 *   pnpm migrate              - Ejecutar migraciones pendientes
 *   pnpm migrate:status       - Ver estado de migraciones
 *   pnpm migrate:run 069      - Ejecutar una migración específica
 * 
 * Requiere en .env.local:
 *   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
 *   
 * O alternativamente:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Colores consola ──────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

function log(msg, color = 'reset') {
  console.log(`${C[color]}${msg}${C.reset}`);
}

function logHeader(msg) {
  const line = '═'.repeat(60);
  log(`\n${line}`, 'cyan');
  log(`  ${msg}`, 'bold');
  log(line, 'cyan');
}

// ── Configuración ────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'sql', 'migrations');

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      log('⚠  DATABASE_URL no encontrado. Necesitás configurarlo en .env.local:', 'yellow');
      log(`   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.${match[1]}.supabase.co:5432/postgres`, 'cyan');
      process.exit(1);
    }
  }
  
  log('❌ Falta DATABASE_URL en .env.local', 'red');
  log('   Formato: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres', 'yellow');
  process.exit(1);
}

// ── Utilidades ───────────────────────────────────────────────────

/** Descubrir archivos de migración en sql/migrations/ */
function discoverMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    log(`❌ Directorio no encontrado: ${MIGRATIONS_DIR}`, 'red');
    process.exit(1);
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.match(/^\d{3}[a-z]?_.*\.sql$/))  // 001_nombre.sql o 060a_nombre.sql
    .sort()
    .map(filename => {
      // Extraer version: "067" de "067_rls_coordinador.sql" o "060a" de "060a_xxx.sql"  
      const match = filename.match(/^(\d{3}[a-z]?)_(.+)\.sql$/);
      if (!match) return null;
      return {
        version: match[1],
        name: match[2],
        filename,
        filepath: path.join(MIGRATIONS_DIR, filename),
      };
    })
    .filter(Boolean);
}

/** Calcular SHA256 checksum de un archivo */
function fileChecksum(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/** Crear tabla schema_migrations si no existe */
async function ensureTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version      VARCHAR(10)   PRIMARY KEY,
      name         TEXT          NOT NULL,
      filename     TEXT          NOT NULL,
      checksum     TEXT,
      applied_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
      applied_by   TEXT          DEFAULT current_user,
      execution_ms INTEGER
    );
  `);
}

/** Obtener versiones ya aplicadas */
async function getAppliedVersions(client) {
  const { rows } = await client.query(
    'SELECT version, checksum FROM schema_migrations ORDER BY version'
  );
  return new Map(rows.map(r => [r.version, r.checksum]));
}

// ── Comandos ─────────────────────────────────────────────────────

/** STATUS: Mostrar estado de todas las migraciones */
async function cmdStatus(client) {
  logHeader('ESTADO DE MIGRACIONES');
  
  await ensureTrackingTable(client);
  const applied = await getAppliedVersions(client);
  const discovered = discoverMigrations();
  
  let pendingCount = 0;
  let appliedCount = 0;
  let modifiedCount = 0;
  
  for (const m of discovered) {
    const appliedChecksum = applied.get(m.version);
    const currentChecksum = fileChecksum(m.filepath);
    
    if (appliedChecksum) {
      appliedCount++;
      if (appliedChecksum && appliedChecksum !== currentChecksum && appliedChecksum !== null) {
        modifiedCount++;
        log(`  ⚠  ${m.version} │ ${m.name}  [MODIFICADO DESPUÉS DE APLICAR]`, 'yellow');
      } else {
        log(`  ✓  ${m.version} │ ${m.name}`, 'green');
      }
    } else {
      pendingCount++;
      log(`  ○  ${m.version} │ ${m.name}  [PENDIENTE]`, 'magenta');
    }
  }
  
  // Check for applied versions not in files (orphaned)
  const fileVersions = new Set(discovered.map(m => m.version));
  for (const [version] of applied) {
    if (!fileVersions.has(version)) {
      log(`  ?  ${version} │ (archivo no encontrado)  [HUÉRFANA]`, 'yellow');
    }
  }
  
  log('');
  log(`  Aplicadas: ${appliedCount}  │  Pendientes: ${pendingCount}  │  Modificadas: ${modifiedCount}`, 'bold');
  
  if (pendingCount > 0) {
    log(`\n  Ejecutar pendientes: pnpm migrate`, 'cyan');
  }
}

/** MIGRATE: Ejecutar migraciones pendientes */
async function cmdMigrate(client, specificVersion = null) {
  logHeader(specificVersion 
    ? `EJECUTAR MIGRACIÓN ${specificVersion}` 
    : 'EJECUTAR MIGRACIONES PENDIENTES'
  );
  
  await ensureTrackingTable(client);
  const applied = await getAppliedVersions(client);
  const discovered = discoverMigrations();
  
  // Filtrar pendientes
  let pending;
  if (specificVersion) {
    pending = discovered.filter(m => m.version === specificVersion);
    if (pending.length === 0) {
      log(`\n❌ Migración ${specificVersion} no encontrada en sql/migrations/`, 'red');
      return;
    }
    if (applied.has(specificVersion)) {
      log(`\n⚠  Migración ${specificVersion} ya fue aplicada`, 'yellow');
      log('  Usar --force para re-ejecutar (no recomendado)', 'dim');
      return;
    }
  } else {
    pending = discovered.filter(m => !applied.has(m.version));
  }
  
  if (pending.length === 0) {
    log('\n✓ No hay migraciones pendientes. Todo al día.', 'green');
    return;
  }
  
  log(`\n  Pendientes: ${pending.length} migración(es)`, 'blue');
  pending.forEach(m => log(`    ○ ${m.version} │ ${m.name}`, 'dim'));
  log('');
  
  let successCount = 0;
  let failedMigration = null;
  
  for (const migration of pending) {
    const startTime = Date.now();
    const sql = fs.readFileSync(migration.filepath, 'utf8');
    const checksum = fileChecksum(migration.filepath);
    
    log(`  ▸ ${migration.version} │ ${migration.name}...`, 'blue');
    
    try {
      // Ejecutar en transacción
      await client.query('BEGIN');
      await client.query(sql);
      
      // Registrar en schema_migrations
      await client.query(
        `INSERT INTO schema_migrations (version, name, filename, checksum, execution_ms)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (version) DO UPDATE SET 
           checksum = EXCLUDED.checksum,
           applied_at = now(),
           execution_ms = EXCLUDED.execution_ms`,
        [migration.version, migration.name, migration.filename, checksum, Date.now() - startTime]
      );
      
      await client.query('COMMIT');
      
      const elapsed = Date.now() - startTime;
      log(`  ✓ ${migration.version} │ ${migration.name}  (${elapsed}ms)`, 'green');
      successCount++;
      
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      
      log(`  ✗ ${migration.version} │ ${migration.name}`, 'red');
      log(`    Error: ${error.message}`, 'red');
      if (error.hint) log(`    Hint: ${error.hint}`, 'yellow');
      if (error.detail) log(`    Detail: ${error.detail}`, 'yellow');
      if (error.position) {
        // Show context around error position
        const pos = parseInt(error.position);
        const context = sql.substring(Math.max(0, pos - 50), pos + 50);
        log(`    Contexto SQL:\n    ...${context}...`, 'dim');
      }
      
      failedMigration = migration;
      break; // Stop on first error
    }
  }
  
  // Summary
  log('');
  if (failedMigration) {
    log(`  ⚠  ${successCount} aplicada(s), 1 fallida, ${pending.length - successCount - 1} omitida(s)`, 'yellow');
    log(`  Corregir ${failedMigration.filename} y volver a ejecutar`, 'yellow');
  } else {
    log(`  ✓ ${successCount} migración(es) aplicada(s) exitosamente`, 'green');
  }
}

/** MARK: Marcar una migración como aplicada sin ejecutarla */
async function cmdMark(client, version) {
  await ensureTrackingTable(client);
  
  const discovered = discoverMigrations();
  const migration = discovered.find(m => m.version === version);
  
  if (!migration) {
    log(`❌ Migración ${version} no encontrada`, 'red');
    return;
  }
  
  const checksum = fileChecksum(migration.filepath);
  
  await client.query(
    `INSERT INTO schema_migrations (version, name, filename, checksum, applied_by)
     VALUES ($1, $2, $3, $4, 'manual-mark')
     ON CONFLICT (version) DO NOTHING`,
    [migration.version, migration.name, migration.filename, checksum]
  );
  
  log(`✓ Migración ${version} marcada como aplicada (sin ejecutar SQL)`, 'green');
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  const param = args[1];
  
  const connectionString = getConnectionString();
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // Timeout para queries de migración (5 min)
    statement_timeout: 300000,
  });
  
  let client;
  try {
    log('🔌 Conectando a PostgreSQL...', 'dim');
    client = await pool.connect();
    log('✓ Conectado\n', 'dim');
    
    switch (command) {
      case 'status':
        await cmdStatus(client);
        break;
        
      case 'run':
        if (param) {
          // pnpm migrate:run 069
          await cmdMigrate(client, param);
        } else {
          // pnpm migrate (run all pending)
          await cmdMigrate(client);
        }
        break;
        
      case 'mark':
        if (!param) {
          log('❌ Uso: pnpm migrate:mark <version>', 'red');
          log('   Ejemplo: pnpm migrate:mark 065', 'yellow');
          break;
        }
        await cmdMark(client, param);
        break;
        
      default:
        log('Uso:', 'bold');
        log('  pnpm migrate              Ejecutar migraciones pendientes', 'cyan');
        log('  pnpm migrate:status       Ver estado de migraciones', 'cyan');
        log('  pnpm migrate:run <ver>    Ejecutar una migración específica', 'cyan');
        log('  pnpm migrate:mark <ver>   Marcar como aplicada sin ejecutar', 'cyan');
    }
    
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      log('❌ No se pudo conectar a la base de datos', 'red');
      log('   Verificar DATABASE_URL en .env.local', 'yellow');
    } else {
      log(`❌ Error: ${error.message}`, 'red');
    }
    process.exit(1);
    
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main().catch(err => {
  log(`❌ Error fatal: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

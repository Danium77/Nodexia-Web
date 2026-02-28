/**
 * NODEXIA - Migration Runner con Tracking
 * =========================================
 * Ejecuta migraciones pendientes y registra cada una en schema_migrations.
 * Soporta múltiples entornos (dev / production).
 * 
 * Uso:
 *   pnpm migrate                    - Ejecutar pendientes en DEV
 *   pnpm migrate:prod               - Ejecutar pendientes en PRODUCTION
 *   pnpm migrate:status             - Ver estado en DEV
 *   pnpm migrate:status:prod        - Ver estado en PRODUCTION
 *   pnpm migrate:run 069            - Ejecutar una migración específica (DEV)
 *   pnpm migrate:run:prod 069       - Ejecutar una migración específica (PROD)
 *   pnpm migrate:mark 065           - Marcar como aplicada sin ejecutar (DEV)
 * 
 * Entornos:
 *   DEV  → lee .env.local           (DATABASE_URL o DATABASE_URL_DEV)
 *   PROD → lee .env.production      (DATABASE_URL_PRODUCTION)
 *         o .env.local con DATABASE_URL_PRODUCTION
 * 
 * Configuración mínima en .env.local:
 *   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-DEV].supabase.co:5432/postgres
 *   DATABASE_URL_PRODUCTION=postgresql://postgres:[PASSWORD]@db.[PROJECT-PROD].supabase.co:5432/postgres
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
  bgRed: '\x1b[41m', white: '\x1b[37m',
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

// ── Detección de entorno ─────────────────────────────────────────

/** Detectar si el usuario quiere prod o dev basado en args */
function detectEnvironment(args) {
  // Explicit --env flag
  const envIdx = args.indexOf('--env');
  if (envIdx !== -1 && args[envIdx + 1]) {
    const env = args[envIdx + 1].toLowerCase();
    args.splice(envIdx, 2); // Remove --env and value from args
    if (['prod', 'production'].includes(env)) return 'production';
    if (['dev', 'development'].includes(env)) return 'development';
  }
  
  // Also check NODE_ENV
  if (process.env.MIGRATE_ENV === 'production') return 'production';
  
  return 'development';
}

// ── Configuración ────────────────────────────────────────────────

const ROOT_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'sql', 'migrations');

/** Cargar variables de entorno según el ambiente */
function loadEnvForEnvironment(env) {
  // Siempre cargar .env.local primero (tiene las vars base)
  const envLocal = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envLocal)) {
    require('dotenv').config({ path: envLocal });
  }
  
  // Si es producción, cargar .env.production que sobrescribe
  if (env === 'production') {
    const envProd = path.join(ROOT_DIR, '.env.production');
    if (fs.existsSync(envProd)) {
      require('dotenv').config({ path: envProd, override: true });
    }
  }
}

function getConnectionString(env) {
  if (env === 'production') {
    // Producción: buscar DATABASE_URL_PRODUCTION primero, luego DATABASE_URL de .env.production
    const prodUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    if (prodUrl && prodUrl !== 'postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres') {
      return prodUrl;
    }
    
    log('❌ Falta DATABASE_URL_PRODUCTION', 'red');
    log('', 'reset');
    log('  Opción A: Agregar en .env.local:', 'yellow');
    log('    DATABASE_URL_PRODUCTION=postgresql://postgres:[PASSWORD]@db.[PROJECT-PROD].supabase.co:5432/postgres', 'cyan');
    log('', 'reset');
    log('  Opción B: Crear archivo .env.production:', 'yellow');
    log('    DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-PROD].supabase.co:5432/postgres', 'cyan');
    log('', 'reset');
    log('  Obtener desde: Supabase Dashboard → Project Settings → Database → Connection string (URI)', 'dim');
    process.exit(1);
  }
  
  // Development: buscar DATABASE_URL_DEV o DATABASE_URL
  const devUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
  if (devUrl) return devUrl;
  
  // Intentar construir desde SUPABASE_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      log('⚠  DATABASE_URL no encontrado. Configuralo en .env.local:', 'yellow');
      log(`   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.${match[1]}.supabase.co:5432/postgres`, 'cyan');
      process.exit(1);
    }
  }
  
  log('❌ Falta DATABASE_URL en .env.local', 'red');
  log('   Formato: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres', 'yellow');
  process.exit(1);
}

/** Extraer project ref de un connection string para mostrar al usuario */
function extractProjectRef(connStr) {
  // Direct connection: db.PROJECT.supabase.co
  const directMatch = connStr.match(/db\.([^.]+)\.supabase/);
  if (directMatch) return directMatch[1];
  // Session pooler: postgres.PROJECT@aws-...
  const poolerMatch = connStr.match(/postgres\.([^:@]+)[@:]/);
  if (poolerMatch) return poolerMatch[1];
  return '???';
}

// ── Utilidades ───────────────────────────────────────────────────

/** Descubrir archivos de migración en sql/migrations/ */
function discoverMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    log(`❌ Directorio no encontrado: ${MIGRATIONS_DIR}`, 'red');
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.match(/^\d{3}[a-z]?_.*\.sql$/))  // 001_nombre.sql o 060a_nombre.sql
    .sort();

  // Detectar versiones duplicadas (ej: 060_index.sql y 060_indices.sql)
  const versionCount = {};
  for (const f of files) {
    const m = f.match(/^(\d{3})[a-z]?_/);
    if (m) versionCount[m[1]] = (versionCount[m[1]] || 0) + 1;
  }

  const versionIndex = {}; // track suffix assignment for duplicates
  return files.map(filename => {
    const match = filename.match(/^(\d{3})([a-z]?)_(.+)\.sql$/);
    if (!match) return null;
    
    let version = match[1] + match[2]; // e.g. "060" or "060a" if file already has suffix
    const name = match[3];
    
    // If file has no letter suffix but there are duplicates, auto-assign a/b/c
    if (!match[2] && versionCount[match[1]] > 1) {
      const idx = versionIndex[match[1]] || 0;
      version = match[1] + String.fromCharCode(97 + idx); // a, b, c...
      versionIndex[match[1]] = idx + 1;
    }
    
    return {
      version,
      name,
      filename,
      filepath: path.join(MIGRATIONS_DIR, filename),
    };
  }).filter(Boolean);
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
async function cmdStatus(client, env, projectRef) {
  logHeader(`ESTADO DE MIGRACIONES — ${env.toUpperCase()} (${projectRef})`);
  
  await ensureTrackingTable(client);
  const applied = await getAppliedVersions(client);
  const discovered = discoverMigrations();
  
  let pendingCount = 0;
  let appliedCount = 0;
  let modifiedCount = 0;
  
  for (const m of discovered) {
    const isApplied = applied.has(m.version);
    const appliedChecksum = applied.get(m.version);
    const currentChecksum = fileChecksum(m.filepath);
    
    if (isApplied) {
      appliedCount++;
      if (appliedChecksum && appliedChecksum !== currentChecksum) {
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
async function cmdMigrate(client, env, projectRef, specificVersion = null) {
  logHeader(specificVersion 
    ? `EJECUTAR MIGRACIÓN ${specificVersion} — ${env.toUpperCase()} (${projectRef})`
    : `EJECUTAR MIGRACIONES PENDIENTES — ${env.toUpperCase()} (${projectRef})`
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

// ── Diff ─────────────────────────────────────────────────────────

/** Queries para extraer schema */
const SCHEMA_QUERIES = {
  tables: `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `,
  columns: `
    SELECT table_name, column_name, data_type, is_nullable, column_default,
           character_maximum_length, numeric_precision
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `,
  policies: `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `,
  indexes: `
    SELECT tablename, indexname, indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `,
  functions: `
    SELECT routine_name, routine_type, data_type as return_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    ORDER BY routine_name
  `,
};

/** DIFF: Comparar schema entre DEV y PROD */
async function cmdDiff() {
  logHeader('COMPARACIÓN DE SCHEMA: DEV vs PROD');
  
  // Necesitamos ambas conexiones
  const ROOT = path.join(__dirname, '..');
  const envLocal = path.join(ROOT, '.env.local');
  if (fs.existsSync(envLocal)) {
    require('dotenv').config({ path: envLocal });
  }
  
  const devUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL_PRODUCTION;
  
  if (!devUrl || !prodUrl) {
    log('❌ Se necesitan ambas URLs configuradas en .env.local:', 'red');
    log('   DATABASE_URL=...              (dev)', 'yellow');
    log('   DATABASE_URL_PRODUCTION=...   (prod)', 'yellow');
    return;
  }
  
  const devRef = extractProjectRef(devUrl);
  const prodRef = extractProjectRef(prodUrl);
  
  log(`  DEV:  ${devRef}`, 'green');
  log(`  PROD: ${prodRef}`, 'red');
  log('');
  
  const poolOpts = { ssl: { rejectUnauthorized: false }, statement_timeout: 60000 };
  const devPool = new Pool({ connectionString: devUrl, ...poolOpts });
  const prodPool = new Pool({ connectionString: prodUrl, ...poolOpts });
  
  let devClient, prodClient;
  try {
    log('  🔌 Conectando a ambas BDs...', 'dim');
    [devClient, prodClient] = await Promise.all([devPool.connect(), prodPool.connect()]);
    log('  ✓ Ambas conectadas\n', 'dim');
    
    let totalDiffs = 0;
    
    // 1. Comparar tablas
    const [devTables, prodTables] = await Promise.all([
      devClient.query(SCHEMA_QUERIES.tables),
      prodClient.query(SCHEMA_QUERIES.tables),
    ]);
    const devTableSet = new Set(devTables.rows.map(r => r.table_name));
    const prodTableSet = new Set(prodTables.rows.map(r => r.table_name));
    
    const onlyDev = [...devTableSet].filter(t => !prodTableSet.has(t));
    const onlyProd = [...prodTableSet].filter(t => !devTableSet.has(t));
    
    log('  ┌─ TABLAS ─────────────────────────────────────', 'bold');
    if (onlyDev.length === 0 && onlyProd.length === 0) {
      log('  │ ✓ Mismas tablas en ambos entornos', 'green');
    } else {
      for (const t of onlyDev) {
        log(`  │ + ${t}  (solo en DEV)`, 'green');
        totalDiffs++;
      }
      for (const t of onlyProd) {
        log(`  │ - ${t}  (solo en PROD)`, 'red');
        totalDiffs++;
      }
    }
    log(`  │ Total: DEV=${devTableSet.size}  PROD=${prodTableSet.size}`, 'dim');
    log('  │', 'dim');
    
    // 2. Comparar columnas (solo tablas en común)
    const [devCols, prodCols] = await Promise.all([
      devClient.query(SCHEMA_QUERIES.columns),
      prodClient.query(SCHEMA_QUERIES.columns),
    ]);
    
    const colKey = (r) => `${r.table_name}.${r.column_name}`;
    const colDetail = (r) => `${r.data_type}${r.character_maximum_length ? `(${r.character_maximum_length})` : ''}${r.is_nullable === 'NO' ? ' NOT NULL' : ''}`;
    
    const devColMap = new Map(devCols.rows.map(r => [colKey(r), { ...r, detail: colDetail(r) }]));
    const prodColMap = new Map(prodCols.rows.map(r => [colKey(r), { ...r, detail: colDetail(r) }]));
    
    const colOnlyDev = [];
    const colOnlyProd = [];
    const colTypeDiff = [];
    
    // Columns in common tables
    const commonTables = [...devTableSet].filter(t => prodTableSet.has(t));
    for (const table of commonTables) {
      const devTableCols = devCols.rows.filter(r => r.table_name === table);
      const prodTableCols = prodCols.rows.filter(r => r.table_name === table);
      const devNames = new Set(devTableCols.map(r => r.column_name));
      const prodNames = new Set(prodTableCols.map(r => r.column_name));
      
      for (const c of devTableCols) {
        if (!prodNames.has(c.column_name)) {
          colOnlyDev.push(`${table}.${c.column_name}`);
        } else {
          const prodCol = prodColMap.get(colKey(c));
          if (prodCol && colDetail(c) !== prodCol.detail) {
            colTypeDiff.push({ col: `${table}.${c.column_name}`, dev: colDetail(c), prod: prodCol.detail });
          }
        }
      }
      for (const c of prodTableCols) {
        if (!devNames.has(c.column_name)) {
          colOnlyProd.push(`${table}.${c.column_name}`);
        }
      }
    }
    
    log('  ├─ COLUMNAS ───────────────────────────────────', 'bold');
    if (colOnlyDev.length === 0 && colOnlyProd.length === 0 && colTypeDiff.length === 0) {
      log('  │ ✓ Mismas columnas en tablas comunes', 'green');
    } else {
      for (const c of colOnlyDev) {
        log(`  │ + ${c}  (solo en DEV)`, 'green');
        totalDiffs++;
      }
      for (const c of colOnlyProd) {
        log(`  │ - ${c}  (solo en PROD)`, 'red');
        totalDiffs++;
      }
      for (const d of colTypeDiff) {
        log(`  │ ~ ${d.col}  DEV: ${d.dev}  │  PROD: ${d.prod}`, 'yellow');
        totalDiffs++;
      }
    }
    log('  │', 'dim');
    
    // 3. Comparar RLS policies
    const [devPolicies, prodPolicies] = await Promise.all([
      devClient.query(SCHEMA_QUERIES.policies),
      prodClient.query(SCHEMA_QUERIES.policies),
    ]);
    
    const policyKey = (r) => `${r.tablename}::${r.policyname}`;
    const devPolicySet = new Set(devPolicies.rows.map(policyKey));
    const prodPolicySet = new Set(prodPolicies.rows.map(policyKey));
    
    const polOnlyDev = devPolicies.rows.filter(r => !prodPolicySet.has(policyKey(r)));
    const polOnlyProd = prodPolicies.rows.filter(r => !devPolicySet.has(policyKey(r)));
    
    // Check policy definition diffs
    const polDefDiffs = [];
    for (const dp of devPolicies.rows) {
      const key = policyKey(dp);
      if (prodPolicySet.has(key)) {
        const pp = prodPolicies.rows.find(r => policyKey(r) === key);
        if (pp && (dp.qual !== pp.qual || dp.with_check !== pp.with_check || dp.cmd !== pp.cmd)) {
          polDefDiffs.push({ name: key, field: dp.qual !== pp.qual ? 'USING' : dp.cmd !== pp.cmd ? 'CMD' : 'WITH CHECK' });
        }
      }
    }
    
    log('  ├─ RLS POLICIES ──────────────────────────────', 'bold');
    if (polOnlyDev.length === 0 && polOnlyProd.length === 0 && polDefDiffs.length === 0) {
      log('  │ ✓ Mismas policies en ambos entornos', 'green');
    } else {
      for (const p of polOnlyDev) {
        log(`  │ + ${p.tablename} → ${p.policyname}  (solo en DEV)`, 'green');
        totalDiffs++;
      }
      for (const p of polOnlyProd) {
        log(`  │ - ${p.tablename} → ${p.policyname}  (solo en PROD)`, 'red');
        totalDiffs++;
      }
      for (const d of polDefDiffs) {
        log(`  │ ~ ${d.name}  (${d.field} difiere)`, 'yellow');
        totalDiffs++;
      }
    }
    log(`  │ Total: DEV=${devPolicies.rows.length}  PROD=${prodPolicies.rows.length}`, 'dim');
    log('  │', 'dim');
    
    // 4. Comparar funciones
    const [devFuncs, prodFuncs] = await Promise.all([
      devClient.query(SCHEMA_QUERIES.functions),
      prodClient.query(SCHEMA_QUERIES.functions),
    ]);
    
    const devFuncSet = new Set(devFuncs.rows.map(r => r.routine_name));
    const prodFuncSet = new Set(prodFuncs.rows.map(r => r.routine_name));
    const funcOnlyDev = [...devFuncSet].filter(f => !prodFuncSet.has(f));
    const funcOnlyProd = [...prodFuncSet].filter(f => !devFuncSet.has(f));
    
    log('  ├─ FUNCIONES ─────────────────────────────────', 'bold');
    if (funcOnlyDev.length === 0 && funcOnlyProd.length === 0) {
      log('  │ ✓ Mismas funciones en ambos entornos', 'green');
    } else {
      for (const f of funcOnlyDev) {
        log(`  │ + ${f}()  (solo en DEV)`, 'green');
        totalDiffs++;
      }
      for (const f of funcOnlyProd) {
        log(`  │ - ${f}()  (solo en PROD)`, 'red');
        totalDiffs++;
      }
    }
    log(`  │ Total: DEV=${devFuncSet.size}  PROD=${prodFuncSet.size}`, 'dim');
    log('  └─────────────────────────────────────────────', 'dim');
    
    // Resumen
    log('');
    if (totalDiffs === 0) {
      log('  ✓ Los schemas son idénticos', 'green');
    } else {
      log(`  ⚠  ${totalDiffs} diferencia(s) encontrada(s)`, 'yellow');
      log('  Las diferencias marcadas con + solo existen en DEV', 'dim');
      log('  Las diferencias marcadas con - solo existen en PROD', 'dim');
      log('  Las diferencias marcadas con ~ tienen definiciones distintas', 'dim');
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    if (devClient) devClient.release();
    if (prodClient) prodClient.release();
    await Promise.all([devPool.end(), prodPool.end()]);
  }
}

// ── Main ─────────────────────────────────────────────────────────

/** Prompt de confirmación para producción */
function confirmProduction(projectRef) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    log('');
    log(`  ${C.bgRed}${C.white}${C.bold}  ⚠  PRODUCCIÓN  ⚠  ${C.reset}`);
    log(`  Proyecto: ${projectRef}`, 'yellow');
    log(`  Los cambios afectarán datos reales de usuarios.`, 'yellow');
    log('');
    
    rl.question(`  Escribí "PROD" para confirmar: `, (answer) => {
      rl.close();
      resolve(answer.trim() === 'PROD');
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const env = detectEnvironment(args);
  const command = args[0] || 'run';
  const param = args[1];
  
  // Diff es especial: conecta a ambas BDs, no necesita seleccionar entorno
  if (command === 'diff') {
    await cmdDiff();
    return;
  }
  
  // Cargar env vars del entorno correspondiente
  loadEnvForEnvironment(env);
  
  const connectionString = getConnectionString(env);
  const projectRef = extractProjectRef(connectionString);
  
  // Banner de entorno
  if (env === 'production') {
    log(`\n  🔴 ENTORNO: PRODUCCIÓN (${projectRef})`, 'red');
  } else {
    log(`\n  🟢 ENTORNO: DESARROLLO (${projectRef})`, 'green');
  }
  
  // Confirmación para producción (excepto status)
  if (env === 'production' && command !== 'status') {
    const confirmed = await confirmProduction(projectRef);
    if (!confirmed) {
      log('\n  Cancelado.', 'dim');
      process.exit(0);
    }
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // Timeout para queries de migración (5 min)
    statement_timeout: 300000,
  });
  
  let client;
  try {
    log('  🔌 Conectando a PostgreSQL...', 'dim');
    client = await pool.connect();
    log('  ✓ Conectado\n', 'dim');
    
    switch (command) {
      case 'status':
        await cmdStatus(client, env, projectRef);
        break;
        
      case 'run':
        if (param) {
          await cmdMigrate(client, env, projectRef, param);
        } else {
          await cmdMigrate(client, env, projectRef);
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
        
      case 'diff':
        await cmdDiff();
        break;
        
      default:
        log('Uso:', 'bold');
        log('', 'reset');
        log('  Desarrollo (default):', 'cyan');
        log('    pnpm migrate                 Ejecutar pendientes en DEV', 'dim');
        log('    pnpm migrate:status          Ver estado en DEV', 'dim');
        log('    pnpm migrate:run 069         Ejecutar migración específica en DEV', 'dim');
        log('    pnpm migrate:mark 065        Marcar como aplicada en DEV', 'dim');
        log('', 'reset');
        log('  Producción:', 'cyan');
        log('    pnpm migrate:prod            Ejecutar pendientes en PROD', 'dim');
        log('    pnpm migrate:status:prod     Ver estado en PROD', 'dim');
        log('    pnpm migrate:run:prod 069    Ejecutar migración específica en PROD', 'dim');
        log('', 'reset');
        log('  Comparación:', 'cyan');
        log('    pnpm migrate:diff            Comparar schema DEV vs PROD', 'dim');
        log('', 'reset');
        log('  Configuración:', 'cyan');
        log('    .env.local                   DATABASE_URL (dev)', 'dim');
        log('    .env.local                   DATABASE_URL_PRODUCTION (prod)', 'dim');
        log('    .env.production              o archivo separado para prod', 'dim');
    }
    
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      log('❌ No se pudo conectar a la base de datos', 'red');
      log(`   Verificar DATABASE_URL en ${env === 'production' ? '.env.production' : '.env.local'}`, 'yellow');
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

/**
 * NODEXIA - Generador de migración de sincronización
 * ====================================================
 * Conecta a DEV y PROD, computa diferencias, y genera SQL
 * para llevar PROD al mismo schema que DEV.
 * 
 * Uso: node scripts/generate-sync-migration.js
 * 
 * Genera archivos en sql/migrations/:
 *   069_sync_cleanup_legacy.sql       - Eliminar tablas/funciones legacy de PROD
 *   070_sync_schema_columns.sql       - Sincronizar columnas y tipos
 *   071_sync_rls_policies.sql         - Sincronizar RLS policies
 *   072_sync_functions.sql            - Sincronizar funciones
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env.local') });

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};
function log(msg, color = 'reset') { console.log(`${C[color]}${msg}${C.reset}`); }

const MIGRATIONS_DIR = path.join(ROOT, 'sql', 'migrations');

// ── Queries ──────────────────────────────────────────────────────

const Q = {
  tables: `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `,
  columns: `
    SELECT table_name, column_name, data_type, udt_name, is_nullable, 
           column_default, character_maximum_length, numeric_precision,
           numeric_scale, ordinal_position
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `,
  policies: `
    SELECT schemaname, tablename, policyname, permissive, roles::text, cmd, 
           pg_get_expr(polrelid::regclass, 0) as table_oid,
           qual::text, with_check::text
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `,
  indexes: `
    SELECT tablename, indexname, indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname NOT LIKE 'pg_%'
    ORDER BY tablename, indexname
  `,
  functions_full: `
    SELECT p.proname as name,
           pg_get_functiondef(p.oid) as definition,
           pg_get_function_identity_arguments(p.oid) as args,
           t.typname as return_type,
           l.lanname as language,
           p.prosecdef as security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_type t ON p.prorettype = t.oid  
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  `,
  triggers: `
    SELECT trigger_name, event_object_table, action_timing, event_manipulation,
           action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `,
  table_create: `
    SELECT c.relname as table_name,
           a.attname as column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
           a.attnotnull as not_null,
           pg_get_expr(d.adbin, d.adrelid) as default_value,
           a.attnum as position
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum
  `,
  constraints: `
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
           kcu.column_name,
           ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `,
  rls_enabled: `
    SELECT relname as table_name, relrowsecurity as rls_enabled
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE nspname = 'public' AND relkind = 'r'
    ORDER BY relname
  `,
  policy_definitions: `
    SELECT pol.polname as policy_name,
           cls.relname as table_name,
           CASE pol.polcmd 
             WHEN 'r' THEN 'SELECT'
             WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE'
             WHEN 'd' THEN 'DELETE'
             WHEN '*' THEN 'ALL'
           END as command,
           CASE pol.polpermissive 
             WHEN true THEN 'PERMISSIVE'
             ELSE 'RESTRICTIVE'
           END as permissive,
           pg_get_expr(pol.polqual, pol.polrelid, true) as using_expr,
           pg_get_expr(pol.polwithcheck, pol.polrelid, true) as with_check_expr,
           ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)) as roles
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
    ORDER BY cls.relname, pol.polname
  `,
};

// ── Helpers ──────────────────────────────────────────────────────

function sqlType(col) {
  let t = col.type;
  if (!t && col.data_type) {
    t = col.data_type;
    if (col.character_maximum_length) t += `(${col.character_maximum_length})`;
  }
  return t;
}

function escapeIdent(s) { return `"${s.replace(/"/g, '""')}"`; }
function escapeLiteral(s) { return s ? `'${s.replace(/'/g, "''")}'` : 'NULL'; }

// Tables to NEVER touch (Supabase internal)
const SKIP_TABLES = new Set([
  'schema_migrations', // our tracking table
  'tracking_gps_backup_20260205_1924', // dev backup, ignore
  'viajes_despacho_backup_20251229', // prod backup, ignore
  'backup_empresas_migration', // prod backup
  'backup_usuarios_empresa_migration', // prod backup
]);

// Functions to never drop (Supabase internal or used by extensions)
const SKIP_FUNCTIONS = new Set([
  'uuid_generate_v1', 'uuid_generate_v1mc', 'uuid_generate_v3',
  'uuid_generate_v4', 'uuid_generate_v5', 'uuid_nil',
  'uuid_ns_dns', 'uuid_ns_oid', 'uuid_ns_url', 'uuid_ns_x500',
  'exec_sql', 'migration_applied',
]);

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  log('\n════════════════════════════════════════════════════════════', 'cyan');
  log('  GENERADOR DE MIGRACIÓN DE SINCRONIZACIÓN DEV → PROD', 'bold');
  log('════════════════════════════════════════════════════════════\n', 'cyan');

  const devUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL_PRODUCTION;

  if (!devUrl || !prodUrl) {
    log('❌ Necesito DATABASE_URL y DATABASE_URL_PRODUCTION en .env.local', 'red');
    process.exit(1);
  }

  const poolOpts = { ssl: { rejectUnauthorized: false }, statement_timeout: 120000 };
  const devPool = new Pool({ connectionString: devUrl, ...poolOpts });
  const prodPool = new Pool({ connectionString: prodUrl, ...poolOpts });
  
  let devClient, prodClient;
  
  try {
    log('  🔌 Conectando...', 'dim');
    [devClient, prodClient] = await Promise.all([devPool.connect(), prodPool.connect()]);
    log('  ✓ Conectado a ambas BDs\n', 'dim');

    // ── Fetch all schema data ──
    log('  📊 Extrayendo schemas...', 'blue');
    
    const [devData, prodData] = await Promise.all([
      fetchAllSchema(devClient, 'DEV'),
      fetchAllSchema(prodClient, 'PROD'),
    ]);
    
    log('  ✓ Schemas extraídos\n', 'dim');

    // ── Generate migrations ──
    const migration069 = generateCleanupSQL(devData, prodData);
    const migration070 = generateColumnSyncSQL(devData, prodData);
    const migration071 = generatePolicySyncSQL(devData, prodData);
    const migration072 = generateFunctionSyncSQL(devData, prodData);

    // ── Write files ──
    writeMigration('069', 'sync_cleanup_legacy', migration069);
    writeMigration('070', 'sync_schema_columns', migration070);
    writeMigration('071', 'sync_rls_policies', migration071);
    writeMigration('072', 'sync_functions', migration072);

    log('\n  ✓ Migraciones generadas en sql/migrations/', 'green');
    log('', 'reset');
    log('  Próximos pasos:', 'cyan');
    log('  1. Revisar los archivos generados', 'dim');
    log('  2. pnpm migrate:run:prod 069  (cleanup)', 'dim');
    log('  3. pnpm migrate:run:prod 070  (columns)', 'dim');
    log('  4. pnpm migrate:run:prod 071  (policies)', 'dim');
    log('  5. pnpm migrate:run:prod 072  (functions)', 'dim');
    log('  6. pnpm migrate:diff          (verificar)', 'dim');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (devClient) devClient.release();
    if (prodClient) prodClient.release();
    await Promise.all([devPool.end(), prodPool.end()]);
  }
}

async function fetchAllSchema(client, label) {
  const [tables, columns, policies, indexes, functions, triggers, tableCreate, constraints, rlsEnabled] = 
    await Promise.all([
      client.query(Q.tables),
      client.query(Q.columns),
      client.query(Q.policy_definitions),
      client.query(Q.indexes),
      client.query(Q.functions_full),
      client.query(Q.triggers),
      client.query(Q.table_create),
      client.query(Q.constraints),
      client.query(Q.rls_enabled),
    ]);

  log(`    ${label}: ${tables.rows.length} tablas, ${columns.rows.length} cols, ${policies.rows.length} policies, ${functions.rows.length} funcs`, 'dim');

  return {
    tables: new Set(tables.rows.map(r => r.table_name)),
    columns: columns.rows,
    policies: policies.rows,
    indexes: indexes.rows,
    functions: functions.rows,
    triggers: triggers.rows,
    tableCreate: tableCreate.rows,
    constraints: constraints.rows,
    rlsEnabled: new Map(rlsEnabled.rows.map(r => [r.table_name, r.rls_enabled])),
    columnMap: buildColumnMap(columns.rows),
    policyMap: buildPolicyMap(policies.rows),
  };
}

function buildColumnMap(cols) {
  const m = new Map();
  for (const c of cols) {
    m.set(`${c.table_name}.${c.column_name}`, c);
  }
  return m;
}

function buildPolicyMap(policies) {
  const m = new Map();
  for (const p of policies) {
    m.set(`${p.table_name}::${p.policy_name}`, p);
  }
  return m;
}

// ── Migration 069: Cleanup legacy ────────────────────────────────

function generateCleanupSQL(dev, prod) {
  const lines = [
    header(69, 'Cleanup: eliminar tablas y objetos legacy de PROD',
      'Elimina tablas que existen en PROD pero no en DEV (legacy/obsoletas).\n' +
      '-- IMPORTANTE: Los datos en estas tablas se perderán. Se hace backup primero.'),
    '',
  ];

  // Tables only in PROD (to drop)
  const toDrop = [...prod.tables]
    .filter(t => !dev.tables.has(t) && !SKIP_TABLES.has(t))
    .sort();

  if (toDrop.length > 0) {
    lines.push('-- ── Eliminar tablas legacy ──────────────────────────────');
    lines.push('-- Estas tablas existen en PROD pero no en DEV.');
    lines.push('-- El código actual no las usa.');
    lines.push('');
    
    for (const t of toDrop) {
      lines.push(`DROP TABLE IF EXISTS ${escapeIdent(t)} CASCADE;`);
    }
    lines.push('');
  }

  // Tables only in DEV (to create in PROD)
  const toCreate = [...dev.tables]
    .filter(t => !prod.tables.has(t) && !SKIP_TABLES.has(t))
    .sort();

  if (toCreate.length > 0) {
    lines.push('-- ── Crear tablas faltantes en PROD ──────────────────────');
    lines.push('');
    
    for (const tableName of toCreate) {
      const cols = dev.tableCreate.filter(c => c.table_name === tableName);
      if (cols.length === 0) continue;

      lines.push(`CREATE TABLE IF NOT EXISTS ${escapeIdent(tableName)} (`);
      const colDefs = cols.map(c => {
        let def = `  ${escapeIdent(c.column_name)} ${c.type}`;
        if (c.not_null) def += ' NOT NULL';
        if (c.default_value) def += ` DEFAULT ${c.default_value}`;
        return def;
      });
      lines.push(colDefs.join(',\n'));
      lines.push(');');
      lines.push('');

      // Add primary key
      const pk = dev.constraints.filter(c => 
        c.table_name === tableName && c.constraint_type === 'PRIMARY KEY'
      );
      if (pk.length > 0) {
        const pkCols = pk.map(c => escapeIdent(c.column_name)).join(', ');
        lines.push(`ALTER TABLE ${escapeIdent(tableName)} ADD PRIMARY KEY (${pkCols});`);
        lines.push('');
      }

      // Enable RLS if enabled in DEV
      if (dev.rlsEnabled.get(tableName)) {
        lines.push(`ALTER TABLE ${escapeIdent(tableName)} ENABLE ROW LEVEL SECURITY;`);
        lines.push('');
      }
    }
  }

  // Indexes only in DEV for common tables
  const commonTables = [...dev.tables].filter(t => prod.tables.has(t));
  const devIdxSet = new Set(dev.indexes.map(i => i.indexname));
  const prodIdxSet = new Set(prod.indexes.map(i => i.indexname));
  
  const missingIndexes = dev.indexes
    .filter(i => !prodIdxSet.has(i.indexname) && commonTables.includes(i.tablename))
    .filter(i => !i.indexname.endsWith('_pkey')); // skip PKs

  if (missingIndexes.length > 0) {
    lines.push('-- ── Crear índices faltantes ─────────────────────────────');
    lines.push('');
    for (const idx of missingIndexes) {
      lines.push(`${idx.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS')};`);
    }
    lines.push('');
  }

  lines.push(footer(69, toDrop.length, toCreate.length));
  return lines.join('\n');
}

// ── Migration 070: Column sync ───────────────────────────────────

function generateColumnSyncSQL(dev, prod) {
  const lines = [
    header(70, 'Schema sync: sincronizar columnas entre DEV y PROD',
      'Agrega columnas faltantes, elimina columnas obsoletas, corrige tipos.'),
    '',
  ];

  const commonTables = [...dev.tables].filter(t => prod.tables.has(t) && !SKIP_TABLES.has(t)).sort();

  let addCount = 0, dropCount = 0, alterCount = 0;

  for (const table of commonTables) {
    const devCols = dev.columns.filter(c => c.table_name === table);
    const prodCols = prod.columns.filter(c => c.table_name === table);
    const devNames = new Set(devCols.map(c => c.column_name));
    const prodNames = new Set(prodCols.map(c => c.column_name));

    const tableLines = [];

    // Columns in DEV but not PROD → ADD
    for (const col of devCols) {
      if (!prodNames.has(col.column_name)) {
        const devDetail = dev.tableCreate.find(c => 
          c.table_name === table && c.column_name === col.column_name
        );
        let type = devDetail ? devDetail.type : col.data_type;
        if (!devDetail && col.character_maximum_length) {
          type += `(${col.character_maximum_length})`;
        }
        
        let stmt = `ALTER TABLE ${escapeIdent(table)} ADD COLUMN IF NOT EXISTS ${escapeIdent(col.column_name)} ${type}`;
        if (devDetail && devDetail.default_value) {
          stmt += ` DEFAULT ${devDetail.default_value}`;
        }
        stmt += ';';
        tableLines.push(stmt);
        addCount++;
      }
    }

    // Columns in PROD but not DEV → DROP (careful!)
    for (const col of prodCols) {
      if (!devNames.has(col.column_name)) {
        tableLines.push(`ALTER TABLE ${escapeIdent(table)} DROP COLUMN IF EXISTS ${escapeIdent(col.column_name)} CASCADE;`);
        dropCount++;
      }
    }

    // Type differences in common columns
    for (const devCol of devCols) {
      if (!prodNames.has(devCol.column_name)) continue;
      const prodCol = prod.columnMap.get(`${table}.${devCol.column_name}`);
      if (!prodCol) continue;

      const devType = normalizeType(devCol);
      const prodType = normalizeType(prodCol);

      if (devType !== prodType) {
        const devDetail = dev.tableCreate.find(c => 
          c.table_name === table && c.column_name === devCol.column_name
        );
        const targetType = devDetail ? devDetail.type : devType;
        
        tableLines.push(
          `-- Cambiar tipo: ${devCol.column_name} de "${prodType}" a "${devType}"`
        );
        tableLines.push(
          `ALTER TABLE ${escapeIdent(table)} ALTER COLUMN ${escapeIdent(devCol.column_name)} TYPE ${targetType} USING ${escapeIdent(devCol.column_name)}::${targetType};`
        );
        alterCount++;
      }

      // NULL constraint differences
      const devNull = devCol.is_nullable === 'YES';
      const prodNull = prodCol.is_nullable === 'YES';
      if (devNull !== prodNull) {
        if (devNull) {
          tableLines.push(
            `ALTER TABLE ${escapeIdent(table)} ALTER COLUMN ${escapeIdent(devCol.column_name)} DROP NOT NULL;`
          );
        } else {
          // Adding NOT NULL is risky if there are NULLs — wrap in DO block
          tableLines.push(
            `-- Agregar NOT NULL (verificar que no haya NULLs primero)`
          );
          tableLines.push(
            `DO $$ BEGIN\n` +
            `  IF NOT EXISTS (SELECT 1 FROM ${escapeIdent(table)} WHERE ${escapeIdent(devCol.column_name)} IS NULL LIMIT 1) THEN\n` +
            `    ALTER TABLE ${escapeIdent(table)} ALTER COLUMN ${escapeIdent(devCol.column_name)} SET NOT NULL;\n` +
            `  ELSE\n` +
            `    RAISE NOTICE 'Skipping NOT NULL on ${table}.${devCol.column_name}: contains NULL values';\n` +
            `  END IF;\n` +
            `END $$;`
          );
        }
        alterCount++;
      }

      // Default value differences
      const devDefault = devCol.column_default;
      const prodDefault = prodCol.column_default;
      if (devDefault !== prodDefault) {
        if (devDefault) {
          tableLines.push(
            `ALTER TABLE ${escapeIdent(table)} ALTER COLUMN ${escapeIdent(devCol.column_name)} SET DEFAULT ${devDefault};`
          );
        } else {
          tableLines.push(
            `ALTER TABLE ${escapeIdent(table)} ALTER COLUMN ${escapeIdent(devCol.column_name)} DROP DEFAULT;`
          );
        }
      }
    }

    if (tableLines.length > 0) {
      lines.push(`-- ── ${table} ──`);
      lines.push(...tableLines);
      lines.push('');
    }
  }

  lines.push(footer(70, addCount, dropCount, alterCount));
  return lines.join('\n');
}

function normalizeType(col) {
  let t = col.data_type;
  if (col.character_maximum_length) t += `(${col.character_maximum_length})`;
  if (col.numeric_precision && col.data_type === 'numeric') {
    t += `(${col.numeric_precision}`;
    if (col.numeric_scale) t += `,${col.numeric_scale}`;
    t += ')';
  }
  return t.toLowerCase()
    .replace('character varying', 'varchar')
    .replace('timestamp with time zone', 'timestamptz')
    .replace('timestamp without time zone', 'timestamp');
}

// ── Migration 071: RLS policies sync ─────────────────────────────

function generatePolicySyncSQL(dev, prod) {
  const lines = [
    header(71, 'RLS sync: sincronizar policies entre DEV y PROD',
      'Elimina policies obsoletas de PROD e instala las de DEV.'),
    '',
  ];

  // Get common tables (only sync policies on tables that exist in both, or will exist after 069)
  const targetTables = new Set([...dev.tables].filter(t => !SKIP_TABLES.has(t)));

  let dropCount = 0, createCount = 0;

  // 1. RLS enablement sync
  lines.push('-- ── Habilitar RLS en tablas que lo tienen en DEV ──────────');
  lines.push('');
  for (const table of [...targetTables].sort()) {
    const devRls = dev.rlsEnabled.get(table);
    if (devRls) {
      lines.push(`ALTER TABLE IF EXISTS ${escapeIdent(table)} ENABLE ROW LEVEL SECURITY;`);
    }
  }
  lines.push('');

  // 2. Drop PROD-only policies (for tables that exist in DEV)
  const prodPoliciesOnCommonTables = prod.policies.filter(p => 
    targetTables.has(p.table_name)
  );
  
  const devPolicyKeys = new Set(dev.policies.map(p => `${p.table_name}::${p.policy_name}`));
  
  const toDrop = prodPoliciesOnCommonTables
    .filter(p => !devPolicyKeys.has(`${p.table_name}::${p.policy_name}`))
    .sort((a, b) => `${a.table_name}${a.policy_name}`.localeCompare(`${b.table_name}${b.policy_name}`));

  if (toDrop.length > 0) {
    lines.push('-- ── Eliminar policies obsoletas de PROD ─────────────────');
    lines.push('');
    for (const p of toDrop) {
      lines.push(`DROP POLICY IF EXISTS ${escapeIdent(p.policy_name)} ON ${escapeIdent(p.table_name)};`);
      dropCount++;
    }
    lines.push('');
  }

  // 3. Create DEV policies that don't exist in PROD + policies with different definitions
  const prodPolicyKeys = new Set(prod.policies.map(p => `${p.table_name}::${p.policy_name}`));
  
  const toCreate = dev.policies
    .filter(p => targetTables.has(p.table_name))
    .filter(p => {
      const key = `${p.table_name}::${p.policy_name}`;
      if (!prodPolicyKeys.has(key)) return true; // New policy
      // Check if definition differs
      const prodP = prod.policyMap.get(key);
      if (!prodP) return true;
      return prodP.using_expr !== p.using_expr || 
             prodP.with_check_expr !== p.with_check_expr ||
             prodP.command !== p.command;
    })
    .sort((a, b) => `${a.table_name}${a.policy_name}`.localeCompare(`${b.table_name}${b.policy_name}`));

  if (toCreate.length > 0) {
    lines.push('-- ── Crear/actualizar policies de DEV ────────────────────');
    lines.push('');
    
    for (const p of toCreate) {
      // Drop first if it exists (for updates)
      if (prodPolicyKeys.has(`${p.table_name}::${p.policy_name}`)) {
        lines.push(`DROP POLICY IF EXISTS ${escapeIdent(p.policy_name)} ON ${escapeIdent(p.table_name)};`);
      }

      let rolesArr = p.roles || [];
      if (typeof rolesArr === 'string') {
        // PostgreSQL returns {role1,role2} format
        rolesArr = rolesArr.replace(/[{}]/g, '').split(',').filter(Boolean);
      }
      const rolesStr = rolesArr.length > 0 
        ? rolesArr.join(', ')
        : 'public';
      
      let stmt = `CREATE POLICY ${escapeIdent(p.policy_name)}\n`;
      stmt += `  ON ${escapeIdent(p.table_name)}\n`;
      stmt += `  AS ${p.permissive}\n`;
      stmt += `  FOR ${p.command}\n`;
      stmt += `  TO ${rolesStr}`;
      
      if (p.using_expr) {
        stmt += `\n  USING (${p.using_expr})`;
      }
      if (p.with_check_expr) {
        stmt += `\n  WITH CHECK (${p.with_check_expr})`;
      }
      stmt += ';';
      
      lines.push(stmt);
      lines.push('');
      createCount++;
    }
  }

  lines.push(footer(71, dropCount, createCount));
  return lines.join('\n');
}

// ── Migration 072: Functions sync ────────────────────────────────

function generateFunctionSyncSQL(dev, prod) {
  const lines = [
    header(72, 'Functions sync: sincronizar funciones entre DEV y PROD',
      'Elimina funciones obsoletas e instala las de DEV.'),
    '',
  ];

  const devFuncMap = new Map(dev.functions.map(f => [`${f.name}(${f.args})`, f]));
  const prodFuncMap = new Map(prod.functions.map(f => [`${f.name}(${f.args})`, f]));

  let dropCount = 0, createCount = 0;

  // 1. Drop functions only in PROD
  const toDrop = prod.functions
    .filter(f => !devFuncMap.has(`${f.name}(${f.args})`) && !SKIP_FUNCTIONS.has(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (toDrop.length > 0) {
    lines.push('-- ── Eliminar funciones obsoletas ────────────────────────');
    lines.push('');
    for (const f of toDrop) {
      lines.push(`DROP FUNCTION IF EXISTS ${escapeIdent(f.name)}(${f.args}) CASCADE;`);
      dropCount++;
    }
    lines.push('');
  }

  // 2. Create/replace functions from DEV
  const toCreateOrUpdate = dev.functions
    .filter(f => {
      if (SKIP_FUNCTIONS.has(f.name)) return false;
      const key = `${f.name}(${f.args})`;
      if (!prodFuncMap.has(key)) return true; // New
      // Check if definition differs
      const prodF = prodFuncMap.get(key);
      return prodF.definition !== f.definition;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (toCreateOrUpdate.length > 0) {
    lines.push('-- ── Crear/actualizar funciones de DEV ───────────────────');
    lines.push('');
    for (const f of toCreateOrUpdate) {
      // pg_get_functiondef returns the full CREATE FUNCTION statement
      lines.push(f.definition.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION') + ';');
      lines.push('');
      createCount++;
    }
  }

  // 3. Sync triggers
  const devTriggers = new Map(dev.triggers.map(t => [`${t.event_object_table}::${t.trigger_name}`, t]));
  const prodTriggers = new Map(prod.triggers.map(t => [`${t.event_object_table}::${t.trigger_name}`, t]));

  // Drop PROD-only triggers
  const triggersToDrop = prod.triggers
    .filter(t => !devTriggers.has(`${t.event_object_table}::${t.trigger_name}`))
    .filter(t => dev.tables.has(t.event_object_table)); // only on tables that exist in DEV

  if (triggersToDrop.length > 0) {
    lines.push('-- ── Eliminar triggers obsoletos ─────────────────────────');
    lines.push('');
    for (const t of triggersToDrop) {
      lines.push(`DROP TRIGGER IF EXISTS ${escapeIdent(t.trigger_name)} ON ${escapeIdent(t.event_object_table)};`);
    }
    lines.push('');
  }

  // Create missing triggers
  const triggersToCreate = dev.triggers
    .filter(t => !prodTriggers.has(`${t.event_object_table}::${t.trigger_name}`));

  if (triggersToCreate.length > 0) {
    lines.push('-- ── Crear triggers faltantes ────────────────────────────');
    lines.push('');
    for (const t of triggersToCreate) {
      lines.push(
        `CREATE TRIGGER ${escapeIdent(t.trigger_name)}\n` +
        `  ${t.action_timing} ${t.event_manipulation}\n` +
        `  ON ${escapeIdent(t.event_object_table)}\n` +
        `  FOR EACH ROW\n` +
        `  ${t.action_statement};`
      );
      lines.push('');
    }
  }

  lines.push(footer(72, dropCount, createCount));
  return lines.join('\n');
}

// ── SQL helpers ──────────────────────────────────────────────────

function header(num, title, desc) {
  return [
    `-- ================================================================`,
    `-- Migración ${String(num).padStart(3, '0')}: ${title}`,
    `-- Fecha: ${new Date().toISOString().split('T')[0]}`,
    `-- Generado automáticamente por generate-sync-migration.js`,
    `-- ${desc}`,
    `-- ================================================================`,
  ].join('\n');
}

function footer(num, ...counts) {
  const labels = ['eliminados', 'creados', 'modificados'];
  const parts = counts.map((c, i) => `${labels[i] || 'items'}: ${c}`).filter((_, i) => counts[i] > 0);
  return [
    '',
    `-- ── Resultado ────────────────────────────────────────────`,
    `-- Migración ${String(num).padStart(3, '0')}: ${parts.join(', ') || 'sin cambios'}`,
    `DO $$ BEGIN`,
    `  RAISE NOTICE '✅ Migración ${String(num).padStart(3, '0')} completada: ${parts.join(', ') || 'sin cambios'}';`,
    `END $$;`,
  ].join('\n');
}

function writeMigration(num, name, sql) {
  const filename = `${num}_${name}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);
  fs.writeFileSync(filepath, sql, 'utf8');
  
  const sizeKB = (Buffer.byteLength(sql, 'utf8') / 1024).toFixed(1);
  const lineCount = sql.split('\n').length;
  log(`  📄 ${filename} (${lineCount} líneas, ${sizeKB} KB)`, 'green');
}

// ── Run ──────────────────────────────────────────────────────────
main();

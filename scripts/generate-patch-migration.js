/**
 * Genera migración 073 con las diferencias restantes entre DEV y PROD.
 * Usa la misma lógica que generate-sync-migration.js pero genera un solo archivo.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const poolOpts = { ssl: { rejectUnauthorized: false }, statement_timeout: 120000 };
  const devPool = new Pool({ connectionString: process.env.DATABASE_URL, ...poolOpts });
  const prodPool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ...poolOpts });
  
  const [devClient, prodClient] = await Promise.all([devPool.connect(), prodPool.connect()]);

  try {
    // Fetch policies from both
    const Q_POLICIES = `
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
    `;
    
    const [devPolicies, prodPolicies] = await Promise.all([
      devClient.query(Q_POLICIES),
      prodClient.query(Q_POLICIES),
    ]);
    
    const prodPolicyKeys = new Set(prodPolicies.rows.map(p => `${p.table_name}::${p.policy_name}`));
    
    // Find policies in DEV but not PROD
    const missingPolicies = devPolicies.rows.filter(p => 
      !prodPolicyKeys.has(`${p.table_name}::${p.policy_name}`)
    );
    
    console.log(`Missing policies: ${missingPolicies.length}`);
    
    // Generate SQL
    const lines = [
      '-- ================================================================',
      '-- Migración 073: Patch final de sincronización DEV → PROD',
      `-- Fecha: ${new Date().toISOString().split('T')[0]}`,
      '-- Crea policies faltantes y corrige columnas restantes.',
      '-- ================================================================',
      '',
      '-- ── Corregir columnas restantes ──────────────────────────',
      '',
      '-- configuracion_sistema.value: agregar NOT NULL',
      'DO $$ BEGIN',
      '  IF NOT EXISTS (SELECT 1 FROM "configuracion_sistema" WHERE "value" IS NULL LIMIT 1) THEN',
      '    ALTER TABLE "configuracion_sistema" ALTER COLUMN "value" SET NOT NULL;',
      '  END IF;',
      'END $$;',
      '',
      '-- roles_empresa.nombre: agregar NOT NULL',
      'DO $$ BEGIN',
      '  IF NOT EXISTS (SELECT 1 FROM "roles_empresa" WHERE "nombre" IS NULL LIMIT 1) THEN',
      '    ALTER TABLE "roles_empresa" ALTER COLUMN "nombre" SET NOT NULL;',
      '  END IF;',
      'END $$;',
      '',
      '-- notificaciones.tipo: cambiar de text a tipo_notificacion',
      'DO $$ BEGIN',
      '  IF EXISTS (',
      '    SELECT 1 FROM information_schema.columns',
      '    WHERE table_schema=\'public\' AND table_name=\'notificaciones\'',
      '      AND column_name=\'tipo\' AND data_type=\'text\'',
      '  ) THEN',
      '    EXECUTE \'ALTER TABLE notificaciones ALTER COLUMN tipo DROP DEFAULT\';',
      '    EXECUTE \'ALTER TABLE notificaciones ALTER COLUMN tipo TYPE tipo_notificacion USING tipo::tipo_notificacion\';',
      '  END IF;',
      'END $$;',
      '',
      '-- ── Crear policies faltantes ─────────────────────────────',
      '',
    ];
    
    for (const p of missingPolicies) {
      let rolesArr = p.roles || [];
      if (typeof rolesArr === 'string') {
        rolesArr = rolesArr.replace(/[{}]/g, '').split(',').filter(Boolean);
      }
      const rolesStr = rolesArr.length > 0 ? rolesArr.join(', ') : 'public';
      
      lines.push(`DROP POLICY IF EXISTS ${qi(p.policy_name)} ON ${qi(p.table_name)};`);
      let stmt = `CREATE POLICY ${qi(p.policy_name)}\n`;
      stmt += `  ON ${qi(p.table_name)}\n`;
      stmt += `  AS ${p.permissive}\n`;
      stmt += `  FOR ${p.command}\n`;
      stmt += `  TO ${rolesStr}`;
      if (p.using_expr) stmt += `\n  USING (${p.using_expr})`;
      if (p.with_check_expr) stmt += `\n  WITH CHECK (${p.with_check_expr})`;
      stmt += ';';
      lines.push(stmt);
      lines.push('');
    }
    
    lines.push('-- ── Resultado ────────────────────────────────────────────');
    lines.push(`-- Migración 073: ${missingPolicies.length} policies creadas, 3 columnas corregidas`);
    lines.push('DO $$ BEGIN');
    lines.push(`  RAISE NOTICE '✅ Migración 073 completada: ${missingPolicies.length} policies, 3 columnas';`);
    lines.push('END $$;');
    
    const sql = lines.join('\n');
    const filepath = path.join(__dirname, '..', 'sql', 'migrations', '073_sync_patch_final.sql');
    fs.writeFileSync(filepath, sql, 'utf8');
    console.log(`Written: ${filepath} (${sql.split('\n').length} lines)`);
    
  } finally {
    devClient.release();
    prodClient.release();
    await Promise.all([devPool.end(), prodPool.end()]);
  }
}

function qi(s) { return `"${s.replace(/"/g, '""')}"`; }
main().catch(console.error);

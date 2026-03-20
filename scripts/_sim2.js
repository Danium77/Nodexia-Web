// Simulate loadData using Supabase REST API (same as browser PostgREST)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const PROD_URL = 'https://lkdcofsfjnltuzzzwoir.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service key to bypass RLS for testing

// We need the PRODUCTION service key, not DEV. Let's check what we have.
// Actually, we don't have the production service key in .env.local
// Let's use the Supabase JS client with production credentials instead

const { createClient } = require('@supabase/supabase-js');

// Check: do we have prod anon key?
// The .env.local NEXT_PUBLIC_SUPABASE_ANON_KEY is for DEV
// We need to use DATABASE_URL_PRODUCTION via pg instead

// Alternative: use pg with connection pooling (port 6543)
const { Pool } = require('pg');

// Use session mode (port 5432) instead of transaction mode (6543) 
const connStr = process.env.DATABASE_URL_PRODUCTION;
console.log('Using pooler connection...');

const pool = new Pool({ 
  connectionString: connStr, 
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

(async () => {
  try {
    const c = await pool.connect();
    console.log('Connected!');
    
    // 1. Check RPC function
    const r1 = await c.query("SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_metricas_expiracion' AND routine_schema = 'public'");
    console.log('get_metricas_expiracion exists:', r1.rows.length > 0);

    // 2. Phase 1 - user empresa
    const abelId = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c';
    const r2 = await c.query(
      "SELECT ue.empresa_id, e.id, e.nombre, e.cuit, e.tipo_empresa FROM usuarios_empresa ue INNER JOIN empresas e ON e.id = ue.empresa_id WHERE ue.user_id = $1 AND ue.activo = true",
      [abelId]
    );
    console.log('Phase1:', JSON.stringify(r2.rows));

    if (r2.rows.length === 0) {
      console.log('FATAL: Phase 1 returned nothing!');
      c.release(); await pool.end(); return;
    }

    const empId = r2.rows[0].id;
    const cuit = r2.rows[0].cuit;

    // 3. Phase 2 - ubicaciones
    const r3 = await c.query("SELECT id, nombre FROM ubicaciones WHERE empresa_id = $1 OR cuit = $2", [empId, cuit]);
    console.log('Ubicaciones:', r3.rows.length, JSON.stringify(r3.rows));

    // 4. Phase 2 - company users
    const r4 = await c.query("SELECT user_id FROM usuarios_empresa WHERE empresa_id = $1 AND activo = true", [empId]);
    console.log('CompanyUsers:', r4.rows.length, JSON.stringify(r4.rows));

    const ubiIds = r3.rows.map(r => r.id);
    const userIds = r4.rows.map(r => r.user_id);
    if (!userIds.includes(abelId)) userIds.push(abelId);

    // 5. Phase 3 - recepciones
    if (ubiIds.length > 0) {
      const r5 = await c.query(
        "SELECT id, pedido_id, destino, destino_id, scheduled_local_date, scheduled_local_time, created_by FROM despachos WHERE destino_id = ANY($1) AND NOT (created_by = ANY($2)) ORDER BY created_at ASC",
        [ubiIds, userIds]
      );
      console.log('Recepciones:', r5.rows.length);
      r5.rows.forEach(r => console.log('  ', JSON.stringify(r)));
    } else {
      console.log('NO ubicaciones -> recepciones skipped');
    }

    // 6. Phase 3 - own despachos
    const r6 = await c.query(
      "SELECT id, pedido_id, destino, scheduled_local_date FROM despachos WHERE created_by = ANY($1) ORDER BY created_at ASC",
      [userIds]
    );
    console.log('Own despachos:', r6.rows.length);

    c.release();
    await pool.end();
  } catch (e) {
    console.error('ERROR:', e.message);
    await pool.end().catch(() => {});
  }
})();

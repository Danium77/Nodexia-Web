require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

// Use PRODUCTION Supabase URL and service role key
// We need to figure out what the production Supabase URL is
const prodUrl = 'https://lkdcofsfjnltuzzzwoir.supabase.co';

// Try to use service role key from env (it's for the DEV project though)
// Let's use direct SQL instead via the pool
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = await pool.connect();
  
  // Simulate the PostgREST query exactly as planificacion.tsx does
  // Phase 1: usuarios_empresa with inner join to empresas
  console.log('--- Simulating Phase 1 ---');
  const phase1 = await c.query(`
    SELECT ue.empresa_id, e.id, e.nombre, e.cuit, e.tipo_empresa
    FROM usuarios_empresa ue
    INNER JOIN empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c'
      AND ue.activo = true
    LIMIT 1
  `);
  console.log('Phase 1 result:', JSON.stringify(phase1.rows[0]));
  
  if (!phase1.rows[0]) {
    console.log('PHASE 1 FAILED - no empresa found!');
    return;
  }
  
  const miEmpresaId = phase1.rows[0].id;
  const cuitEmpresa = phase1.rows[0].cuit;
  console.log('miEmpresaId:', miEmpresaId, 'cuitEmpresa:', cuitEmpresa);

  // Phase 2: company users + ubicaciones
  console.log('\n--- Simulating Phase 2 ---');
  const users = await c.query(
    'SELECT user_id FROM usuarios_empresa WHERE empresa_id = $1 AND activo = true',
    [miEmpresaId]
  );
  const allCompanyUserIds = users.rows.map(r => r.user_id);
  console.log('Company user_ids:', allCompanyUserIds);

  const ubis = await c.query(
    'SELECT id FROM ubicaciones WHERE empresa_id = $1 OR cuit = $2',
    [miEmpresaId, cuitEmpresa]
  );
  const ubicacionIds = ubis.rows.map(r => r.id);
  console.log('ubicacionIds:', ubicacionIds);

  // Phase 3: despachos + recepciones
  console.log('\n--- Simulating Phase 3 ---');
  const despachos = await c.query(
    'SELECT id, pedido_id FROM despachos WHERE created_by = ANY($1::uuid[])',
    [allCompanyUserIds]
  );
  console.log('Despachos by company users:', despachos.rows.length);

  if (ubicacionIds.length > 0) {
    const recepciones = await c.query(
      `SELECT id, pedido_id, scheduled_local_date, scheduled_local_time 
       FROM despachos 
       WHERE destino_id = ANY($1::uuid[]) 
         AND NOT (created_by = ANY($2::uuid[]))`,
      [ubicacionIds, allCompanyUserIds]
    );
    console.log('Recepciones:', recepciones.rows.length);
    recepciones.rows.forEach(r => console.log('  ', JSON.stringify(r)));
  } else {
    console.log('No ubicacionIds - recepciones query skipped!');
  }

  c.release();
  await pool.end();
})();

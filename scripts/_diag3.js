require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = await pool.connect();
  
  // Check RLS on usuarios_empresa
  const rls1 = await c.query(`
    SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'usuarios_empresa'
  `);
  console.log('usuarios_empresa RLS:', JSON.stringify(rls1.rows[0]));

  const p1 = await c.query(`
    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr 
    FROM pg_policy WHERE polrelid = 'usuarios_empresa'::regclass
  `);
  console.log('usuarios_empresa policies:');
  p1.rows.forEach(r => console.log(JSON.stringify(r)));

  // Check RLS on empresas
  const rls2 = await c.query(`
    SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'empresas'
  `);
  console.log('\nempresas RLS:', JSON.stringify(rls2.rows[0]));

  const p2 = await c.query(`
    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr 
    FROM pg_policy WHERE polrelid = 'empresas'::regclass
  `);
  console.log('empresas policies:');
  p2.rows.forEach(r => console.log(JSON.stringify(r)));

  // Check get_metricas_expiracion function exists
  const fn = await c.query(`
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_name = 'get_metricas_expiracion'
  `);
  console.log('\nget_metricas_expiracion exists:', fn.rows.length > 0);

  c.release();
  await pool.end();
})();

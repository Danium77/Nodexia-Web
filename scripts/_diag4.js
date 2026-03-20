require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');

(async () => {
  // Check auth.users on BOTH databases
  for (const [label, connStr] of [['DEV', process.env.DATABASE_URL], ['PROD', process.env.DATABASE_URL_PRODUCTION]]) {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const c = await pool.connect();
    
    const abel = await c.query(`
      SELECT id, email FROM auth.users 
      WHERE id = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c' OR email ILIKE '%abel%' OR email ILIKE '%ramirez%'
    `);
    console.log(`${label} - Abel in auth.users:`, JSON.stringify(abel.rows));
    
    // Also check what Supabase URL the env has
    if (label === 'DEV') {
      console.log(`${label} - NEXT_PUBLIC_SUPABASE_URL:`, process.env.NEXT_PUBLIC_SUPABASE_URL);
    }

    c.release();
    await pool.end();
  }
})();

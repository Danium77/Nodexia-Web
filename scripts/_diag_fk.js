require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');

(async () => {
  for (const [label, connStr] of [['DEV', process.env.DATABASE_URL], ['PROD', process.env.DATABASE_URL_PRODUCTION]]) {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const c = await pool.connect();

    // Check FK constraints on usuarios_empresa
    const fks = await c.query(`
      SELECT conname, conrelid::regclass as table_name, 
             confrelid::regclass as referenced_table,
             pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'usuarios_empresa'::regclass 
        AND contype = 'f'
    `);
    console.log(`\n${label} - FK constraints on usuarios_empresa:`);
    fks.rows.forEach(r => console.log(`  ${r.conname}: ${r.definition}`));

    // Check if PostgREST schema cache knows about the relationship
    // We can test via Supabase client if we have the service role key
    
    c.release();
    await pool.end();
  }
})();

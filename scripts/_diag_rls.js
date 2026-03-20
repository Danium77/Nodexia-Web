require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

// PRODUCTION Supabase
const prodUrl = 'https://lkdcofsfjnltuzzzwoir.supabase.co';
const prodAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGNvZnNmam5sdHV6enp3b2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3Mzg3NzMsImV4cCI6MjA1MTMxNDc3M30.B-0BrHlVPALaWKdRXxWiB3eqvdUMz_rsgRJHWwRkVL8';

// We need Abel's credentials to sign in
// Let's use service role to bypass auth and test the query as if Abel was logged in
// First try: use service role from the same env file 
// Note: SUPABASE_SERVICE_ROLE_KEY in .env.local belongs to DEV project, not PROD.

// Let's try a different approach: use the service role to impersonate Abel
// Actually, let's just use admin client + RLS bypass to test queries directly.

// Use the DATABASE_URL_PRODUCTION to get the PROD service role key
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = await pool.connect();
  
  // Get the service role key from vault (probably not available)
  // Instead, let's set session as Abel and run queries as he would
  
  // Set auth.uid() to Abel's ID to simulate RLS
  await c.query("SET LOCAL role = 'authenticated'");
  await c.query("SET LOCAL request.jwt.claim.sub = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c'");
  await c.query("SET LOCAL request.jwt.claims = '{\"sub\":\"1fa203c0-bbea-4eab-a1ec-b0810fbaf33c\",\"role\":\"authenticated\"}'");
  
  // Phase 1: The exact query PostgREST would run
  console.log('--- Testing with RLS as Abel ---');
  
  try {
    const ue = await c.query(`
      SELECT ue.empresa_id, e.id, e.nombre, e.cuit, e.tipo_empresa
      FROM usuarios_empresa ue
      INNER JOIN empresas e ON e.id = ue.empresa_id
      WHERE ue.user_id = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c'
        AND ue.activo = true
    `);
    console.log('Phase 1 (as authenticated Abel):', JSON.stringify(ue.rows));
  } catch (err) {
    console.error('Phase 1 error:', err.message);
  }

  try {
    const ubis = await c.query(`
      SELECT id FROM ubicaciones 
      WHERE empresa_id = '9fef2a0c-b6b6-444e-bccd-12c66943c74c' 
         OR cuit = '20-28848617-5'
    `);
    console.log('Ubicaciones (as authenticated Abel):', JSON.stringify(ubis.rows));
  } catch (err) {
    console.error('Ubicaciones error:', err.message);
  }

  try {
    const desp = await c.query(`
      SELECT id, pedido_id FROM despachos 
      WHERE destino_id = 'd299744e-f13d-44ae-8383-71ffb284e47c'
        AND created_by != '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c'
    `);
    console.log('Recepciones (as authenticated Abel):', JSON.stringify(desp.rows));
  } catch (err) {
    console.error('Recepciones error:', err.message);
  }

  c.release();
  await pool.end();
})();

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = await pool.connect();
  
  const r = await c.query(`
    SELECT ue.user_id, ue.empresa_id, ue.activo, ue.rol_interno, e.nombre, e.cuit, e.tipo_empresa
    FROM usuarios_empresa ue
    JOIN empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c'
  `);
  console.log('ALL usuario_empresa rows for Abel:', r.rows.length);
  r.rows.forEach(row => console.log(JSON.stringify(row)));

  // Also check: what does Supabase client see with the same query?
  // The planificacion query uses: .eq('user_id', user.id).eq('activo', true).maybeSingle()
  const active = r.rows.filter(row => row.activo === true);
  console.log('\nActive rows:', active.length);
  if (active.length > 1) {
    console.log('⚠️ MULTIPLE active rows - maybeSingle will return null!');
  }
  
  c.release();
  await pool.end();
})();

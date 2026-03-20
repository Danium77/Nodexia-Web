require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = await pool.connect();

  // Abel Ramirez user_id in PROD
  const abel = await c.query(`
    SELECT ue.user_id, ue.empresa_id, ue.rol_interno, e.nombre, e.cuit, e.tipo_empresa
    FROM usuarios_empresa ue
    JOIN empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c'
    AND ue.activo = true
  `);
  console.log('=== Abel empresa ===');
  abel.rows.forEach(r => console.log(JSON.stringify(r)));

  // Tecnopack empresa details
  const tec = await c.query(`SELECT id, nombre, cuit, tipo_empresa FROM empresas WHERE id = '9fef2a0c-b6b6-444e-bccd-12c66943c74c'`);
  console.log('\n=== Tecnopack empresa ===');
  console.log(JSON.stringify(tec.rows[0]));

  // Ubicaciones matching by empresa_id OR cuit
  const cuit = tec.rows[0]?.cuit;
  const empId = tec.rows[0]?.id;
  console.log(`\nSearching ubicaciones with empresa_id=${empId} OR cuit=${cuit}`);
  
  const ubis = await c.query(`
    SELECT id, nombre, empresa_id, cuit 
    FROM ubicaciones 
    WHERE empresa_id = $1 OR cuit = $2
  `, [empId, cuit]);
  console.log('=== Matching ubicaciones ===');
  ubis.rows.forEach(r => console.log(JSON.stringify(r)));

  // Company users
  const users = await c.query(`
    SELECT user_id FROM usuarios_empresa 
    WHERE empresa_id = $1 AND activo = true
  `, [empId]);
  console.log('\n=== Company user_ids ===');
  users.rows.forEach(r => console.log(r.user_id));

  // Check if there are despachos created by company users
  const userIds = users.rows.map(r => r.user_id);
  if (userIds.length > 0) {
    const desp = await c.query(`
      SELECT id, pedido_id, created_by FROM despachos 
      WHERE created_by = ANY($1::uuid[])
    `, [userIds]);
    console.log('\n=== Despachos by Tecnopack users ===');
    desp.rows.forEach(r => console.log(JSON.stringify(r)));
  }

  // Check if recepciones query would work
  const ubiIds = ubis.rows.map(r => r.id);
  if (ubiIds.length > 0 && userIds.length > 0) {
    const recep = await c.query(`
      SELECT id, pedido_id, destino_id, created_by, scheduled_local_date, scheduled_local_time
      FROM despachos 
      WHERE destino_id = ANY($1::uuid[])
        AND created_by != ALL($2::uuid[])
    `, [ubiIds, userIds]);
    console.log('\n=== Recepciones query result ===');
    recep.rows.forEach(r => console.log(JSON.stringify(r)));
  } else {
    console.log('\n=== Cannot run recepciones query ===');
    console.log('ubiIds:', ubiIds.length, 'userIds:', userIds.length);
  }

  c.release();
  await pool.end();
})();

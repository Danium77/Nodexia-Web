require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');

// Check DEV database
const devPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Check PRODUCTION database
const prodPool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  console.log('=== DEV DATABASE (yllnzkjpvaukeeqzuxit) ===');
  const devC = await devPool.connect();
  
  const devEmp = await devC.query("SELECT id, nombre FROM empresas WHERE nombre ILIKE '%tecnopack%'");
  console.log('Tecnopack empresa:', JSON.stringify(devEmp.rows));
  
  const devUbi = await devC.query(`
    SELECT id, nombre, empresa_id FROM ubicaciones 
    WHERE nombre ILIKE '%tecnopack%' OR empresa_id IN (SELECT id FROM empresas WHERE nombre ILIKE '%tecnopack%')
  `);
  console.log('Tecnopack ubicaciones:', JSON.stringify(devUbi.rows));
  
  const devUsers = await devC.query(`
    SELECT ue.user_id, ue.empresa_id, ue.rol_interno, u.nombre_completo
    FROM usuarios_empresa ue
    LEFT JOIN usuarios u ON u.id = ue.user_id
    WHERE ue.empresa_id IN (SELECT id FROM empresas WHERE nombre ILIKE '%tecnopack%')
    AND ue.activo = true
  `);
  console.log('Tecnopack users:', JSON.stringify(devUsers.rows));

  const devDesp = await devC.query(`
    SELECT id, pedido_id, destino, destino_id, scheduled_local_date, created_by 
    FROM despachos 
    WHERE destino ILIKE '%tecnopack%' OR destino_id IN (
      SELECT id FROM ubicaciones WHERE empresa_id IN (SELECT id FROM empresas WHERE nombre ILIKE '%tecnopack%')
    )
    LIMIT 5
  `);
  console.log('Despachos to Tecnopack:', JSON.stringify(devDesp.rows));

  devC.release();
  await devPool.end();

  console.log('\n=== PRODUCTION DATABASE (lkdcofsfjnltuzzzwoir) ===');
  const prodC = await prodPool.connect();
  
  const prodDesp = await prodC.query(`
    SELECT id, pedido_id, destino, destino_id, scheduled_local_date, created_by 
    FROM despachos 
    WHERE destino ILIKE '%tecnopack%' LIMIT 5
  `);
  console.log('Despachos to Tecnopack:', JSON.stringify(prodDesp.rows));

  prodC.release();
  await prodPool.end();
})();

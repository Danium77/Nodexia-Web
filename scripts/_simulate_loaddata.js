require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL_PRODUCTION, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = await pool.connect();
  
  // 1. Check if get_metricas_expiracion function exists in production
  const funcs = await c.query(`
    SELECT routine_name, routine_type 
    FROM information_schema.routines 
    WHERE routine_name = 'get_metricas_expiracion' 
    AND routine_schema = 'public'
  `);
  console.log('=== get_metricas_expiracion function ===');
  console.log('Exists:', funcs.rows.length > 0 ? 'YES' : 'NO');
  if (funcs.rows.length > 0) console.log(JSON.stringify(funcs.rows[0]));

  // 2. Simulate full loadData Phase 1 for Abel Ramirez
  const abelId = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c';
  const phase1 = await c.query(`
    SELECT ue.empresa_id, e.id, e.nombre, e.cuit, e.tipo_empresa
    FROM usuarios_empresa ue
    INNER JOIN empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = $1 AND ue.activo = true
  `, [abelId]);
  console.log('\n=== Phase 1: usuario_empresa ===');
  console.log(JSON.stringify(phase1.rows));

  if (phase1.rows.length === 0) {
    console.log('❌ Phase 1 returned NOTHING - this is the root cause!');
    c.release();
    await pool.end();
    return;
  }

  const miEmpresaId = phase1.rows[0].id;
  const cuit = phase1.rows[0].cuit;
  console.log('miEmpresaId:', miEmpresaId, 'cuit:', cuit);

  // 3. Phase 2: ubicaciones
  const ubicaciones = await c.query(`
    SELECT id FROM ubicaciones WHERE empresa_id = $1 OR cuit = $2
  `, [miEmpresaId, cuit]);
  console.log('\n=== Phase 2: ubicaciones ===');
  console.log('Count:', ubicaciones.rows.length);
  console.log(JSON.stringify(ubicaciones.rows));

  // 4. Phase 2: company users
  const companyUsers = await c.query(`
    SELECT user_id FROM usuarios_empresa WHERE empresa_id = $1 AND activo = true
  `, [miEmpresaId]);
  console.log('\n=== Phase 2: company users ===');
  console.log('Count:', companyUsers.rows.length);
  console.log(JSON.stringify(companyUsers.rows));

  const companyUserIds = companyUsers.rows.map(r => r.user_id);
  if (!companyUserIds.includes(abelId)) companyUserIds.push(abelId);
  
  const ubicacionIds = ubicaciones.rows.map(r => r.id);

  // 5. Phase 3: recepciones
  if (ubicacionIds.length > 0) {
    const placeholdersUbi = ubicacionIds.map((_, i) => `$${i + 1}`).join(',');
    const placeholdersUsers = companyUserIds.map((_, i) => `$${ubicacionIds.length + i + 1}`).join(',');
    
    const recepciones = await c.query(`
      SELECT id, pedido_id, destino, destino_id, scheduled_local_date, scheduled_local_time, created_by
      FROM despachos
      WHERE destino_id IN (${placeholdersUbi})
        AND created_by NOT IN (${placeholdersUsers})
      ORDER BY created_at ASC
    `, [...ubicacionIds, ...companyUserIds]);
    console.log('\n=== Phase 3: recepciones ===');
    console.log('Count:', recepciones.rows.length);
    recepciones.rows.forEach(r => console.log(JSON.stringify(r)));
  } else {
    console.log('\n❌ No ubicaciones found - recepciones query skipped!');
  }

  // 6. Phase 3: own despachos (created by company users)
  if (companyUserIds.length > 0) {
    const placeholders = companyUserIds.map((_, i) => `$${i + 1}`).join(',');
    const despachos = await c.query(`
      SELECT id, pedido_id, origen, destino, scheduled_local_date, created_by
      FROM despachos
      WHERE created_by IN (${placeholders})
      ORDER BY created_at ASC
    `, companyUserIds);
    console.log('\n=== Phase 3: own despachos ===');
    console.log('Count:', despachos.rows.length);
    despachos.rows.forEach(r => console.log(JSON.stringify(r)));
  }

  c.release();
  await pool.end();
})();

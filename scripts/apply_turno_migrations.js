require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  
  console.log('=== Applying turno tables, triggers, and policies ===\n');
  
  await client.query('BEGIN');
  try {
    // 081: Create ventanas_recepcion
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventanas_recepcion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_planta_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        capacidad INT NOT NULL DEFAULT 1,
        duracion_turno_minutos INT NOT NULL DEFAULT 60,
        activa BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT ck_ventana_horario CHECK (hora_fin > hora_inicio)
      );
    `);
    console.log('OK: ventanas_recepcion table');
    
    // 081: Create turnos_reservados
    await client.query(`
      CREATE TABLE IF NOT EXISTS turnos_reservados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ventana_id UUID NOT NULL REFERENCES ventanas_recepcion(id) ON DELETE CASCADE,
        empresa_transporte_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        despacho_id UUID REFERENCES despachos(id) ON DELETE SET NULL,
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        estado TEXT NOT NULL DEFAULT 'reservado'
          CHECK (estado IN ('reservado','confirmado','completado','cancelado','no_show')),
        patente_camion TEXT,
        chofer_nombre TEXT,
        observaciones TEXT,
        reservado_por UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('OK: turnos_reservados table');
    
    // Indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ventanas_planta ON ventanas_recepcion(empresa_planta_id);
      CREATE INDEX IF NOT EXISTS idx_ventanas_dia ON ventanas_recepcion(dia_semana, activa);
      CREATE INDEX IF NOT EXISTS idx_turnos_ventana_fecha ON turnos_reservados(ventana_id, fecha);
      CREATE INDEX IF NOT EXISTS idx_turnos_transporte ON turnos_reservados(empresa_transporte_id, fecha);
      CREATE INDEX IF NOT EXISTS idx_turnos_despacho ON turnos_reservados(despacho_id);
      CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos_reservados(estado, fecha);
    `);
    console.log('OK: indices');
    
    // RLS
    await client.query(`
      ALTER TABLE ventanas_recepcion ENABLE ROW LEVEL SECURITY;
      ALTER TABLE turnos_reservados ENABLE ROW LEVEL SECURITY;
    `);
    
    // Ventanas policies (skip if already exist)
    const policies = [
      `CREATE POLICY ventanas_select ON ventanas_recepcion FOR SELECT TO authenticated USING (true)`,
      `CREATE POLICY ventanas_insert ON ventanas_recepcion FOR INSERT TO authenticated WITH CHECK (empresa_planta_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()))`,
      `CREATE POLICY ventanas_update ON ventanas_recepcion FOR UPDATE TO authenticated USING (empresa_planta_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()))`,
      `CREATE POLICY ventanas_delete ON ventanas_recepcion FOR DELETE TO authenticated USING (empresa_planta_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()))`,
      `CREATE POLICY turnos_select ON turnos_reservados FOR SELECT TO authenticated USING (empresa_transporte_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()) OR ventana_id IN (SELECT v.id FROM ventanas_recepcion v JOIN usuarios_empresa ue ON ue.empresa_id = v.empresa_planta_id AND ue.user_id = auth.uid()))`,
      `CREATE POLICY turnos_insert ON turnos_reservados FOR INSERT TO authenticated WITH CHECK (true)`,
      `CREATE POLICY turnos_update ON turnos_reservados FOR UPDATE TO authenticated USING (empresa_transporte_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()) OR ventana_id IN (SELECT v.id FROM ventanas_recepcion v JOIN usuarios_empresa ue ON ue.empresa_id = v.empresa_planta_id AND ue.user_id = auth.uid()))`,
    ];
    
    for (const sql of policies) {
      try { await client.query(sql); } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    }
    console.log('OK: RLS policies (ventanas + turnos)');
    
    // 082: numero_turno columns
    await client.query(`ALTER TABLE empresas ADD COLUMN IF NOT EXISTS codigo_turno VARCHAR(4)`);
    await client.query(`ALTER TABLE turnos_reservados ADD COLUMN IF NOT EXISTS numero_turno TEXT`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_numero_turno ON turnos_reservados(numero_turno) WHERE numero_turno IS NOT NULL`);
    console.log('OK: numero_turno column + index');
    
    // 082: turno_contadores
    await client.query(`
      CREATE TABLE IF NOT EXISTS turno_contadores (
        empresa_planta_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
        ultimo_numero INT NOT NULL DEFAULT 0
      );
      ALTER TABLE turno_contadores ENABLE ROW LEVEL SECURITY;
    `);
    console.log('OK: turno_contadores table');
    
    // 087: turno_contadores policies
    const contadorPolicies = [
      `CREATE POLICY turno_contadores_select ON turno_contadores FOR SELECT TO authenticated USING (true)`,
      `CREATE POLICY turno_contadores_insert ON turno_contadores FOR INSERT TO authenticated WITH CHECK (true)`,
      `CREATE POLICY turno_contadores_update ON turno_contadores FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`,
    ];
    for (const sql of contadorPolicies) {
      try { await client.query(sql); } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    }
    console.log('OK: turno_contadores RLS policies');
    
    // 086: trigger function (SECURITY DEFINER)
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_generar_numero_turno()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_planta_id UUID;
        v_codigo TEXT;
        v_siguiente INT;
      BEGIN
        SELECT vr.empresa_planta_id INTO v_planta_id
        FROM ventanas_recepcion vr WHERE vr.id = NEW.ventana_id;
        IF v_planta_id IS NULL THEN RETURN NEW; END IF;
        INSERT INTO turno_contadores (empresa_planta_id, ultimo_numero)
        VALUES (v_planta_id, 0) ON CONFLICT (empresa_planta_id) DO NOTHING;
        UPDATE turno_contadores SET ultimo_numero = ultimo_numero + 1
        WHERE empresa_planta_id = v_planta_id RETURNING ultimo_numero INTO v_siguiente;
        SELECT COALESCE(codigo_turno, UPPER(LEFT(REGEXP_REPLACE(nombre, '[^A-Za-z]', '', 'g'), 2)))
        INTO v_codigo FROM empresas WHERE id = v_planta_id;
        NEW.numero_turno := v_codigo || LPAD(v_siguiente::TEXT, 4, '0');
        RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql;
    `);
    console.log('OK: fn_generar_numero_turno (SECURITY DEFINER)');
    
    // Trigger
    await client.query(`DROP TRIGGER IF EXISTS trg_numero_turno ON turnos_reservados`);
    await client.query(`
      CREATE TRIGGER trg_numero_turno
        BEFORE INSERT ON turnos_reservados
        FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_turno();
    `);
    console.log('OK: trigger trg_numero_turno');
    
    // Vista
    await client.query(`
      CREATE OR REPLACE VIEW vista_disponibilidad_turnos AS
      SELECT
        v.id AS ventana_id, v.empresa_planta_id, v.nombre AS ventana_nombre,
        v.dia_semana, v.hora_inicio, v.hora_fin, v.capacidad, v.duracion_turno_minutos,
        t.fecha, COUNT(t.id) FILTER (WHERE t.estado NOT IN ('cancelado')) AS ocupados
      FROM ventanas_recepcion v
      LEFT JOIN turnos_reservados t ON t.ventana_id = v.id
      WHERE v.activa = true
      GROUP BY v.id, v.empresa_planta_id, v.nombre, v.dia_semana, v.hora_inicio, v.hora_fin, v.capacidad, v.duracion_turno_minutos, t.fecha;
    `);
    console.log('OK: vista_disponibilidad_turnos');
    
    // Conditionally update funciones_sistema if it exists
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'funciones_sistema') THEN
          UPDATE funciones_sistema SET activo = true WHERE clave = 'turnos_recepcion';
        END IF;
      END $$;
    `);
    console.log('OK: funciones_sistema check (skipped if table missing)');
    
    // Register migrations as applied
    for (const v of [81, 82, 86, 87]) {
      await client.query(
        `INSERT INTO schema_migrations (version, name, filename, checksum, applied_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (version) DO UPDATE SET applied_at = now()`,
        [v, 'turnos_combined', 'combined_081_082_086_087', 'combined']
      );
    }
    
    await client.query('COMMIT');
    console.log('\n=== ALL TURNO MIGRATIONS APPLIED SUCCESSFULLY ===');
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\nFAILED:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  }
  
  // Verify
  const { rows } = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%turno%' OR tablename LIKE '%ventana%')"
  );
  console.log('\nTurno tables now:', rows.map(r => r.tablename));
  
  client.release();
  await pool.end();
})().catch(e => { console.error(e.message); pool.end(); });

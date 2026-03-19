-- ============================================================
-- 082: Número único de turno con identificador de empresa
-- Formato: {codigo_planta}{secuencia_4dig} → ej: AC0001
-- ============================================================

-- 1. Agregar codigo_turno a empresas (código corto para numerar turnos)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS codigo_turno VARCHAR(4);

-- 2. Agregar numero_turno a turnos_reservados
ALTER TABLE turnos_reservados ADD COLUMN IF NOT EXISTS numero_turno TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_numero_turno ON turnos_reservados(numero_turno) WHERE numero_turno IS NOT NULL;

-- 3. Tabla de contadores por planta (secuencia independiente)
CREATE TABLE IF NOT EXISTS turno_contadores (
  empresa_planta_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  ultimo_numero INT NOT NULL DEFAULT 0
);

-- 4. Función que genera numero_turno automáticamente en INSERT
CREATE OR REPLACE FUNCTION fn_generar_numero_turno()
RETURNS TRIGGER AS $$
DECLARE
  v_planta_id UUID;
  v_codigo TEXT;
  v_siguiente INT;
BEGIN
  -- Obtener planta desde la ventana
  SELECT vr.empresa_planta_id INTO v_planta_id
  FROM ventanas_recepcion vr WHERE vr.id = NEW.ventana_id;

  IF v_planta_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert contador
  INSERT INTO turno_contadores (empresa_planta_id, ultimo_numero)
  VALUES (v_planta_id, 0)
  ON CONFLICT (empresa_planta_id) DO NOTHING;

  -- Incrementar y obtener siguiente número
  UPDATE turno_contadores
  SET ultimo_numero = ultimo_numero + 1
  WHERE empresa_planta_id = v_planta_id
  RETURNING ultimo_numero INTO v_siguiente;

  -- Obtener código de la planta (fallback: 2 primeras letras del nombre)
  SELECT COALESCE(codigo_turno, UPPER(LEFT(REGEXP_REPLACE(nombre, '[^A-Za-z]', '', 'g'), 2)))
  INTO v_codigo
  FROM empresas WHERE id = v_planta_id;

  NEW.numero_turno := v_codigo || LPAD(v_siguiente::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger BEFORE INSERT en turnos_reservados
DROP TRIGGER IF EXISTS trg_numero_turno ON turnos_reservados;
CREATE TRIGGER trg_numero_turno
  BEFORE INSERT ON turnos_reservados
  FOR EACH ROW
  EXECUTE FUNCTION fn_generar_numero_turno();

-- 6. RLS para turno_contadores (solo lectura autenticados, escritura via trigger)
ALTER TABLE turno_contadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY turno_contadores_select ON turno_contadores FOR SELECT TO authenticated USING (true);

-- 7. Registrar migración
INSERT INTO schema_migrations (version, name, filename, checksum, applied_at)
VALUES (82, 'numero_turno', '082_numero_turno.sql', md5('082_numero_turno')::text, now())
ON CONFLICT (version) DO NOTHING;

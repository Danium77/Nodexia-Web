-- 053_fix_incidencias_viaje.sql
-- Unifica el schema de incidencias_viaje para que coincida con la API crear-incidencia.ts
-- Ejecutar en Supabase SQL Editor

-- Paso 1: Verificar si la tabla existe con schema incorrecto y recrearla
-- (Si no existe, simplemente la crea. Si existe con datos, los preserva via ALTER.)

-- Crear tabla si no existe (schema correcto)
CREATE TABLE IF NOT EXISTS incidencias_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  tipo_incidencia TEXT NOT NULL,
  severidad TEXT DEFAULT 'media',
  estado TEXT DEFAULT 'abierta',
  descripcion TEXT NOT NULL,
  resolucion TEXT,
  fecha_incidencia TIMESTAMPTZ DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  reportado_por UUID NOT NULL,
  resuelto_por UUID,
  fotos_incidencia JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paso 2: Agregar columnas que pueden faltar si se usó el schema viejo
DO $$
BEGIN
  -- Agregar severidad si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'severidad') THEN
    ALTER TABLE incidencias_viaje ADD COLUMN severidad TEXT DEFAULT 'media';
    RAISE NOTICE 'Columna severidad agregada';
  END IF;

  -- Agregar estado si no existe (el schema viejo usaba estado_resolucion)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'estado') THEN
    ALTER TABLE incidencias_viaje ADD COLUMN estado TEXT DEFAULT 'abierta';
    -- Copiar datos de estado_resolucion si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'estado_resolucion') THEN
      UPDATE incidencias_viaje SET estado = COALESCE(estado_resolucion, 'abierta');
    END IF;
    RAISE NOTICE 'Columna estado agregada';
  END IF;

  -- Agregar fecha_incidencia si no existe (el schema viejo usaba fecha_reporte)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'fecha_incidencia') THEN
    ALTER TABLE incidencias_viaje ADD COLUMN fecha_incidencia TIMESTAMPTZ DEFAULT NOW();
    -- Copiar datos de fecha_reporte si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'fecha_reporte') THEN
      UPDATE incidencias_viaje SET fecha_incidencia = fecha_reporte;
    END IF;
    RAISE NOTICE 'Columna fecha_incidencia agregada';
  END IF;

  -- Agregar resolucion si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'resolucion') THEN
    ALTER TABLE incidencias_viaje ADD COLUMN resolucion TEXT;
    RAISE NOTICE 'Columna resolucion agregada';
  END IF;

  -- Agregar resuelto_por si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'resuelto_por') THEN
    ALTER TABLE incidencias_viaje ADD COLUMN resuelto_por UUID;
    RAISE NOTICE 'Columna resuelto_por agregada';
  END IF;

  -- Agregar fotos_incidencia si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias_viaje' AND column_name = 'fotos_incidencia') THEN
    ALTER TABLE incidencias_viaje ADD COLUMN fotos_incidencia JSONB;
    RAISE NOTICE 'Columna fotos_incidencia agregada';
  END IF;
END $$;

-- Paso 3: Quitar CHECK constraints viejos y agregar los correctos
-- CHECK en tipo_incidencia: permitir todos los tipos posibles
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar CHECKs viejos de tipo_incidencia
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    WHERE rel.relname = 'incidencias_viaje'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo_incidencia%'
  LOOP
    EXECUTE 'ALTER TABLE incidencias_viaje DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'CHECK constraint % eliminado', r.conname;
  END LOOP;

  -- Eliminar CHECKs viejos de estado/estado_resolucion
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    WHERE rel.relname = 'incidencias_viaje'
      AND con.contype = 'c'
      AND (pg_get_constraintdef(con.oid) ILIKE '%estado%')
  LOOP
    EXECUTE 'ALTER TABLE incidencias_viaje DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'CHECK constraint % eliminado', r.conname;
  END LOOP;

  -- Eliminar CHECKs viejos de severidad
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    WHERE rel.relname = 'incidencias_viaje'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%severidad%'
  LOOP
    EXECUTE 'ALTER TABLE incidencias_viaje DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'CHECK constraint % eliminado', r.conname;
  END LOOP;
END $$;

-- Agregar CHECK correctos
ALTER TABLE incidencias_viaje ADD CONSTRAINT chk_tipo_incidencia
  CHECK (tipo_incidencia IN (
    'retraso', 'averia_camion', 'documentacion_faltante',
    'producto_danado', 'accidente', 'demora',
    'problema_mecanico', 'problema_carga', 'ruta_bloqueada',
    'clima_adverso', 'otro'
  ));

ALTER TABLE incidencias_viaje ADD CONSTRAINT chk_estado_incidencia
  CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada'));

ALTER TABLE incidencias_viaje ADD CONSTRAINT chk_severidad_incidencia
  CHECK (severidad IN ('baja', 'media', 'alta', 'critica'));

-- Paso 4: Quitar FK constraint viejo de reportado_por si apunta a usuarios (debería ser auth.users)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    WHERE rel.relname = 'incidencias_viaje'
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%reportado_por%'
  LOOP
    EXECUTE 'ALTER TABLE incidencias_viaje DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'FK constraint % eliminado de reportado_por', r.conname;
  END LOOP;
END $$;

-- Paso 5: Índices
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_id ON incidencias_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias_viaje(estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_severidad ON incidencias_viaje(severidad);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON incidencias_viaje(fecha_incidencia);

-- Paso 6: RLS
ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;

-- Política permisiva para usuarios autenticados (crear y ver)
DROP POLICY IF EXISTS "Usuarios pueden ver incidencias" ON incidencias_viaje;
CREATE POLICY "Usuarios pueden ver incidencias"
  ON incidencias_viaje FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear incidencias" ON incidencias_viaje;
CREATE POLICY "Usuarios autenticados pueden crear incidencias"
  ON incidencias_viaje FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios pueden actualizar incidencias" ON incidencias_viaje;
CREATE POLICY "Usuarios pueden actualizar incidencias"
  ON incidencias_viaje FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verificación
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.columns WHERE table_name = 'incidencias_viaje';
  RAISE NOTICE '✅ Tabla incidencias_viaje lista con % columnas', v_count;
END $$;

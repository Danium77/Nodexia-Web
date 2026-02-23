-- ============================================================================
-- MIGRACIÓN 065: Deprecar id_transporte en camiones, acoplados, choferes
-- Fecha: 2026-02-23
-- Sesión: 31
-- 
-- CONTEXTO:
-- Las tablas camiones, acoplados y choferes originalmente usaban id_transporte 
-- como FK a la empresa de transporte propietaria. Se migró a empresa_id pero
-- PROD aún tiene id_transporte NOT NULL, causando errores de insert.
--
-- IMPORTANTE: viajes_despacho.id_transporte NO se toca — es el FK activo
-- que indica qué empresa de transporte tiene asignado cada viaje.
--
-- CAMBIOS:
-- 1. DROP NOT NULL en camiones.id_transporte, acoplados.id_transporte, choferes.id_transporte
-- 2. Asegurar que empresa_id esté poblado con el valor de id_transporte donde falte
-- 3. Actualizar RLS policy de tracking_gps para usar empresa_id en vez de id_transporte
-- 4. Crear índices en empresa_id si no existen
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 1: Backfill empresa_id donde esté vacío (por seguridad)
-- ═══════════════════════════════════════════════════════════════════════════

-- Camiones: copiar id_transporte → empresa_id donde empresa_id sea NULL
UPDATE camiones 
SET empresa_id = id_transporte 
WHERE empresa_id IS NULL AND id_transporte IS NOT NULL;

-- Acoplados: copiar id_transporte → empresa_id donde empresa_id sea NULL
UPDATE acoplados 
SET empresa_id = id_transporte 
WHERE empresa_id IS NULL AND id_transporte IS NOT NULL;

-- Choferes: copiar id_transporte → empresa_id donde empresa_id sea NULL
UPDATE choferes 
SET empresa_id = id_transporte 
WHERE empresa_id IS NULL AND id_transporte IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2: DROP NOT NULL en id_transporte (flota)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE camiones ALTER COLUMN id_transporte DROP NOT NULL;
ALTER TABLE acoplados ALTER COLUMN id_transporte DROP NOT NULL;
ALTER TABLE choferes ALTER COLUMN id_transporte DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 3: Asegurar NOT NULL en empresa_id (columna canónica)
-- ═══════════════════════════════════════════════════════════════════════════

-- Solo si empresa_id ya existe y puede tener rows con NULL
-- (no usar SET NOT NULL directamente por si hay datos inconsistentes)
DO $$
BEGIN
  -- Verificar que no hay camiones sin empresa_id
  IF EXISTS (SELECT 1 FROM camiones WHERE empresa_id IS NULL LIMIT 1) THEN
    RAISE NOTICE 'WARNING: Hay camiones sin empresa_id. No se aplica NOT NULL.';
  ELSE
    ALTER TABLE camiones ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM acoplados WHERE empresa_id IS NULL LIMIT 1) THEN
    RAISE NOTICE 'WARNING: Hay acoplados sin empresa_id. No se aplica NOT NULL.';
  ELSE
    ALTER TABLE acoplados ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM choferes WHERE empresa_id IS NULL LIMIT 1) THEN
    RAISE NOTICE 'WARNING: Hay choferes sin empresa_id. No se aplica NOT NULL.';
  ELSE
    ALTER TABLE choferes ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 4: Índices y FK constraints en empresa_id
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_camiones_empresa_id ON camiones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_acoplados_empresa_id ON acoplados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_choferes_empresa_id ON choferes(empresa_id);

-- FK constraints para que PostgREST (Supabase) pueda hacer JOINs con empresas:empresa_id
-- Usar IF NOT EXISTS pattern (PG doesn't support IF NOT EXISTS for constraints directly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_camiones_empresa_id' AND table_name = 'camiones'
  ) THEN
    ALTER TABLE camiones ADD CONSTRAINT fk_camiones_empresa_id 
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_acoplados_empresa_id' AND table_name = 'acoplados'
  ) THEN
    ALTER TABLE acoplados ADD CONSTRAINT fk_acoplados_empresa_id 
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_choferes_empresa_id' AND table_name = 'choferes'
  ) THEN
    ALTER TABLE choferes ADD CONSTRAINT fk_choferes_empresa_id 
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 5: Actualizar RLS policy de tracking_gps
-- Cambia: choferes.id_transporte → choferes.empresa_id
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Usuarios ven tracking de su empresa" ON tracking_gps;
CREATE POLICY "Usuarios ven tracking de su empresa"
ON tracking_gps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM choferes c
    JOIN usuarios_empresa ue ON c.empresa_id = ue.empresa_id
    WHERE c.id = tracking_gps.chofer_id
      AND ue.user_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 6: Comentarios de deprecación
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN camiones.id_transporte IS 'DEPRECATED — usar empresa_id. Se mantiene por compatibilidad, será eliminado en migración futura.';
COMMENT ON COLUMN acoplados.id_transporte IS 'DEPRECATED — usar empresa_id. Se mantiene por compatibilidad, será eliminado en migración futura.';
COMMENT ON COLUMN choferes.id_transporte IS 'DEPRECATED — usar empresa_id. Se mantiene por compatibilidad, será eliminado en migración futura.';

COMMIT;

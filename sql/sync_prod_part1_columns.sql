-- ============================================================================
-- SYNC PRODUCCIÓN - PARTE 1: Columnas faltantes en tablas existentes
-- ============================================================================
-- Ejecutar en: https://supabase.com/dashboard/project/lkdcofsfjnltuzzzwoir/sql/new
-- Todas las operaciones son idempotentes (IF NOT EXISTS / IF EXISTS)
-- ============================================================================

-- === DESPACHOS: columnas de fecha descarga (migración 014) ===
ALTER TABLE despachos
  ADD COLUMN IF NOT EXISTS delivery_scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS delivery_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_window_hours INT DEFAULT 2;

-- === DESPACHOS: columnas de ubicación ID (migraciones 023, 041) ===
ALTER TABLE despachos
  ADD COLUMN IF NOT EXISTS origen_id UUID,
  ADD COLUMN IF NOT EXISTS destino_id UUID,
  ADD COLUMN IF NOT EXISTS origen_ubicacion_id UUID,
  ADD COLUMN IF NOT EXISTS destino_ubicacion_id UUID;

-- FKs para origen_id / destino_id (ignorar si ya existen)
DO $$ BEGIN
  ALTER TABLE despachos ADD CONSTRAINT fk_despachos_origen_ubicacion
    FOREIGN KEY (origen_id) REFERENCES ubicaciones(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE despachos ADD CONSTRAINT fk_despachos_destino_ubicacion
    FOREIGN KEY (destino_id) REFERENCES ubicaciones(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FKs para origen_ubicacion_id / destino_ubicacion_id
DO $$ BEGIN
  ALTER TABLE despachos ADD CONSTRAINT fk_despachos_origen_ubicacion_id
    FOREIGN KEY (origen_ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE despachos ADD CONSTRAINT fk_despachos_destino_ubicacion_id
    FOREIGN KEY (destino_ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === VIAJES_DESPACHO: columnas de reprogramación (migración 016) ===
ALTER TABLE viajes_despacho
  ADD COLUMN IF NOT EXISTS fue_expirado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_expiracion_original TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cantidad_reprogramaciones INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_reprogramacion TEXT;

-- === VIAJES_DESPACHO: columna documentación (migraciones 045, 046) ===
ALTER TABLE viajes_despacho
  ADD COLUMN IF NOT EXISTS documentacion_completa BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS documentacion_recursos_verificada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS documentacion_recursos_verificada_por UUID,
  ADD COLUMN IF NOT EXISTS documentacion_recursos_verificada_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE viajes_despacho ADD CONSTRAINT fk_viajes_doc_verificada_por
    FOREIGN KEY (documentacion_recursos_verificada_por) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === VIAJES_DESPACHO: columna parada_actual (migración 058) ===
ALTER TABLE viajes_despacho
  ADD COLUMN IF NOT EXISTS parada_actual INTEGER DEFAULT 1;

-- === VIAJES_DESPACHO: columna scheduled_at (fecha programada del viaje) ===
ALTER TABLE viajes_despacho
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- === USUARIOS_EMPRESA: columna dni (migración 021) ===
ALTER TABLE usuarios_empresa
  ADD COLUMN IF NOT EXISTS dni TEXT;

-- === USUARIOS_EMPRESA: columna ubicación (migración 040) ===
ALTER TABLE usuarios_empresa
  ADD COLUMN IF NOT EXISTS ubicacion_actual_id UUID;

DO $$ BEGIN
  ALTER TABLE usuarios_empresa ADD CONSTRAINT fk_usuarios_empresa_ubicacion
    FOREIGN KEY (ubicacion_actual_id) REFERENCES ubicaciones(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === VERIFICACIÓN ===
DO $$
BEGIN
  RAISE NOTICE 'PARTE 1 COMPLETADA: Columnas añadidas a tablas existentes';
END $$;

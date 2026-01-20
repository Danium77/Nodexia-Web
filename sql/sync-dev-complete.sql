-- =====================================================
-- SINCRONIZACIÓN COMPLETA DEV CON PRODUCCIÓN
-- Fecha: 20 de Enero 2026
-- Objetivo: Replicar estructura completa de producción en dev
-- =====================================================

-- PASO 1: Crear tabla estado_carga_viaje (si no existe)
-- =====================================================

CREATE TABLE IF NOT EXISTS estado_carga_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL UNIQUE REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Estado actual de la carga
  estado_carga TEXT NOT NULL DEFAULT 'pendiente',
  
  -- Timestamps de transiciones
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_planificacion TIMESTAMPTZ,
  fecha_documentacion_preparada TIMESTAMPTZ,
  fecha_cargando TIMESTAMPTZ,
  fecha_carga_completada TIMESTAMPTZ,
  fecha_en_transito TIMESTAMPTZ,
  fecha_entregado TIMESTAMPTZ,
  
  -- Datos de la carga
  producto TEXT,
  peso_estimado_kg DECIMAL(10,2),
  peso_real_kg DECIMAL(10,2),
  cantidad_bultos INTEGER,
  
  -- Documentación
  remito_numero TEXT,
  remito_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Crear índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_estado_carga_viaje_viaje_id 
ON estado_carga_viaje(viaje_id);

CREATE INDEX IF NOT EXISTS idx_estado_carga_viaje_estado 
ON estado_carga_viaje(estado_carga);

-- PASO 3: Habilitar RLS
-- =====================================================

ALTER TABLE estado_carga_viaje ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden ver
DROP POLICY IF EXISTS "Usuarios ven estado_carga_viaje" ON estado_carga_viaje;
CREATE POLICY "Usuarios ven estado_carga_viaje"
ON estado_carga_viaje FOR SELECT
USING (auth.role() = 'authenticated');

-- Política: Sistema puede insertar/actualizar
DROP POLICY IF EXISTS "Sistema maneja estado_carga_viaje" ON estado_carga_viaje;
CREATE POLICY "Sistema maneja estado_carga_viaje"
ON estado_carga_viaje FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- PASO 4: Verificar que todo se creó correctamente
-- =====================================================

SELECT 
  'estado_carga_viaje' as tabla,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'estado_carga_viaje'
ORDER BY ordinal_position;

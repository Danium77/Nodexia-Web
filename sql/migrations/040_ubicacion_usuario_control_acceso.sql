-- =====================================================
-- MIGRACIÓN 040: Ubicación actual para usuarios Control de Acceso
-- =====================================================
-- Fecha: 07-FEB-2026
-- Descripción: Agregar campo ubicacion_actual_id a usuarios_empresa
--              para que usuarios de Control de Acceso puedan seleccionar
--              en qué ubicación están trabajando
-- =====================================================

-- Agregar columna ubicacion_actual_id (opcional)
ALTER TABLE usuarios_empresa 
ADD COLUMN IF NOT EXISTS ubicacion_actual_id UUID REFERENCES ubicaciones(id) ON DELETE SET NULL;

-- Comentario explicativo
COMMENT ON COLUMN usuarios_empresa.ubicacion_actual_id IS 
  'Ubicación donde el usuario está trabajando actualmente.
   - NULL para coordinadores (ven todas las ubicaciones de su empresa)
   - NOT NULL para control_acceso (necesitan saber en qué planta están)
   - Se guarda también en localStorage del navegador para persistencia';

-- Índice para mejorar performance en queries de control de acceso
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_ubicacion 
ON usuarios_empresa(ubicacion_actual_id) 
WHERE ubicacion_actual_id IS NOT NULL;

-- RLS: Usuario puede ver y actualizar su propia ubicacion_actual_id
-- (Ya están creadas las políticas de usuarios_empresa, solo actualizarlas)

-- Verificación
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios_empresa'
  AND column_name = 'ubicacion_actual_id';

-- ============================================================================
-- FIX: Actualizar CHECK constraint viajes_despacho_estado_unidad_check
-- ============================================================================
-- Fecha: 15-Feb-2026
-- Problema: El CHECK constraint en viajes_despacho.estado_unidad no incluye
--   'confirmado_chofer', 'transporte_asignado', 'pendiente' ni otros estados
--   del flujo centralizado de 17+1 estados.
--   Esto causa error al confirmar viaje desde chofer-mobile.
-- ============================================================================

-- Eliminar constraint viejo
ALTER TABLE viajes_despacho
  DROP CONSTRAINT IF EXISTS viajes_despacho_estado_unidad_check;

-- Crear constraint con los 17 + cancelado estados centralizados
ALTER TABLE viajes_despacho
  ADD CONSTRAINT viajes_despacho_estado_unidad_check
  CHECK (
    estado_unidad IS NULL OR
    estado_unidad IN (
      'pendiente',
      'transporte_asignado',
      'camion_asignado',
      'confirmado_chofer',
      'en_transito_origen',
      'ingresado_origen',
      'llamado_carga',
      'cargando',
      'cargado',
      'egreso_origen',
      'en_transito_destino',
      'ingresado_destino',
      'llamado_descarga',
      'descargando',
      'descargado',
      'egreso_destino',
      'completado',
      'cancelado'
    )
  );

-- Verificar
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'viajes_despacho'::regclass
  AND conname = 'viajes_despacho_estado_unidad_check';

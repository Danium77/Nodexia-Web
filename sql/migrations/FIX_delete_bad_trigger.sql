-- ================================================
-- ELIMINAR TRIGGER PROBLEMÁTICO
-- Fecha: 11 de Noviembre 2025
-- ================================================

-- Eliminar el trigger problemático
DROP TRIGGER IF EXISTS trigger_notificar_cambio_estado ON viajes_despacho CASCADE;

-- Eliminar la función problemática
DROP FUNCTION IF EXISTS notificar_cambio_estado_viaje() CASCADE;

-- Verificar que se eliminaron
SELECT 
  'Triggers restantes en viajes_despacho:' as info,
  trigger_name,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'viajes_despacho';

-- Mostrar funciones restantes con 'notificacion'
SELECT 
  'Funciones restantes con notificacion:' as info,
  routine_name
FROM information_schema.routines 
WHERE routine_name LIKE '%notificacion%';

-- Resultado final
SELECT '✅ Trigger problemático eliminado - Probá de nuevo la asignación' as resultado;

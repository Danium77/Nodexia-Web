-- ================================================
-- DEBUG: Encontrar TODOS los triggers y funciones relacionados
-- Fecha: 11 de Noviembre 2025
-- ================================================

-- PASO 1: Mostrar TODOS los triggers en viajes_despacho
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'viajes_despacho'
ORDER BY trigger_name;

-- PASO 2: Mostrar TODAS las funciones que contienen 'notificacion'
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%notificacion%'
   OR routine_definition LIKE '%notificaciones%'
ORDER BY routine_name;

-- PASO 3: Buscar funciones que usan 'empresa_id' en su código
SELECT 
  routine_name,
  routine_type,
  LEFT(routine_definition, 200) as preview
FROM information_schema.routines 
WHERE routine_definition LIKE '%empresa_id%'
   AND routine_name LIKE '%notificacion%'
ORDER BY routine_name;

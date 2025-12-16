-- ============================================================================
-- VERIFICAR TRIGGERS Y FUNCIONES QUE PUEDAN USAR ch.user_id
-- Fecha: 2025-11-02
-- ============================================================================

-- Ver todos los triggers en las tablas de flota
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('choferes', 'camiones', 'acoplados', 'viajes_despacho')
ORDER BY event_object_table, trigger_name;

-- Ver funciones que podrían estar causando el problema
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%ch.user_id%'
   OR routine_definition LIKE '%choferes%'
ORDER BY routine_name;

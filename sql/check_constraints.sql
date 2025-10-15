-- Verificar si hay triggers o constraints que puedan estar interfiriendo
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'relaciones_empresa';

-- Ver constraints de la tabla
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'relaciones_empresa';

-- Verificar permisos del usuario actual
SELECT current_user, session_user;
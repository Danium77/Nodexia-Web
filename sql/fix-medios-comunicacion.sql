-- =============================================
-- LIMPIEZA DE DATOS: Prioridad "Medios de comunicación"
-- Ejecutar en: Supabase SQL Editor
-- Fecha: 26 Oct 2025
-- =============================================

-- 1. Ver cuántos registros tienen el problema
SELECT COUNT(*) as total_afectados 
FROM despachos 
WHERE prioridad = 'Medios de comunicación';

-- 2. Ver los registros afectados (opcional)
SELECT id, numero, prioridad, created_at 
FROM despachos 
WHERE prioridad = 'Medios de comunicación'
ORDER BY created_at DESC
LIMIT 10;

-- 3. EJECUTAR LIMPIEZA: Cambiar a 'Media'
UPDATE despachos 
SET prioridad = 'Media' 
WHERE prioridad = 'Medios de comunicación';

-- 4. Agregar constraint para prevenir futuros valores inválidos
ALTER TABLE despachos 
ADD CONSTRAINT check_prioridad 
CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente'));

-- 5. Verificar que se aplicó correctamente
SELECT prioridad, COUNT(*) as cantidad
FROM despachos 
GROUP BY prioridad
ORDER BY prioridad;

-- 6. Verificar que no quedan valores inválidos
SELECT id, numero, prioridad 
FROM despachos 
WHERE prioridad NOT IN ('Baja', 'Media', 'Alta', 'Urgente');

-- =============================================
-- RESULTADO ESPERADO:
-- - 0 registros con "Medios de comunicación"
-- - Constraint agregado para validar valores futuros
-- - Solo se permiten: Baja, Media, Alta, Urgente
-- =============================================

-- ROLLBACK (solo si algo sale mal):
-- ALTER TABLE despachos DROP CONSTRAINT check_prioridad;

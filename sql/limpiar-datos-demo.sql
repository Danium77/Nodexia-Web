-- Script para limpiar datos de prueba/demo
-- Ejecutar con cuidado: eliminará registros demo

-- ==================================================
-- PASO 1: Respaldar datos antes de eliminar (opcional)
-- ==================================================
-- Descomenta si quieres hacer backup primero:
-- CREATE TABLE backup_viajes_despacho AS SELECT * FROM viajes_despacho WHERE numero_viaje LIKE 'VJ-2025-%';
-- CREATE TABLE backup_registro_control_acceso AS SELECT * FROM registro_control_acceso WHERE viaje_id IN (SELECT id FROM viajes_despacho WHERE numero_viaje LIKE 'VJ-2025-%');

-- ==================================================
-- PASO 2: Eliminar registros relacionados primero
-- ==================================================

-- Eliminar registros de acceso (si la tabla existe)
DO $$
DECLARE
  viajes_ids UUID[];
BEGIN
  -- Obtener IDs de viajes demo
  SELECT ARRAY(SELECT id FROM viajes_despacho WHERE numero_viaje LIKE 'VJ-2025-%') INTO viajes_ids;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registro_control_acceso') THEN
    DELETE FROM registro_control_acceso WHERE viaje_id = ANY(viajes_ids);
    RAISE NOTICE '✅ Registros de acceso eliminados';
  ELSE
    RAISE NOTICE 'ℹ️  Tabla registro_control_acceso no existe, saltando...';
  END IF;
END $$;

-- Eliminar incidencias relacionadas (si la tabla existe)
DO $$
DECLARE
  viajes_ids UUID[];
BEGIN
  -- Obtener IDs de viajes demo
  SELECT ARRAY(SELECT id FROM viajes_despacho WHERE numero_viaje LIKE 'VJ-2025-%') INTO viajes_ids;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidencias_viaje') THEN
    DELETE FROM incidencias_viaje WHERE viaje_id = ANY(viajes_ids);
    RAISE NOTICE '✅ Incidencias eliminadas';
  ELSE
    RAISE NOTICE 'ℹ️  Tabla incidencias_viaje no existe, saltando...';
  END IF;
END $$;

-- ==================================================
-- PASO 3: Eliminar viajes demo
-- ==================================================

-- Eliminar viajes de prueba (identificados por patrón VJ-2025-XXX)
DELETE FROM viajes_despacho 
WHERE numero_viaje LIKE 'VJ-2025-%';

-- ==================================================
-- PASO 4: Verificar resultado
-- ==================================================

-- Verificar que se eliminaron correctamente
SELECT 
  COUNT(*) as viajes_demo_restantes
FROM viajes_despacho
WHERE numero_viaje LIKE 'VJ-2025-%';

-- ==================================================
-- OPCIONAL: Resetear secuencias si quieres empezar desde cero
-- ==================================================
-- Descomenta si quieres resetear los IDs:
-- ALTER SEQUENCE viajes_despacho_id_seq RESTART WITH 1;
-- ALTER SEQUENCE registro_control_acceso_id_seq RESTART WITH 1;

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Datos demo eliminados exitosamente';
  RAISE NOTICE '📊 Verifica los resultados en la consulta anterior';
END $$;

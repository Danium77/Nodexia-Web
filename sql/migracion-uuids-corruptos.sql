-- =====================================
-- MIGRACIÓN: CORREGIR UUIDs CORRUPTOS
-- Fecha: 29-Dic-2025
-- Problema: Campos id_chofer e id_camion tienen UUIDs de 37 caracteres
-- Solución: Truncar a 36 caracteres válidos y cambiar tipo de datos
-- =====================================

-- ====================================
-- PASO 0: BACKUP DE SEGURIDAD
-- ====================================
-- IMPORTANTE: Ejecutar en Supabase Dashboard primero

-- Crear tabla de backup
CREATE TABLE IF NOT EXISTS viajes_despacho_backup_20251229 AS 
SELECT * FROM viajes_despacho;

-- Verificar backup
SELECT COUNT(*) as total_backup FROM viajes_despacho_backup_20251229;
SELECT COUNT(*) as total_original FROM viajes_despacho;

-- ====================================
-- PASO 1: ANÁLISIS PRE-MIGRACIÓN
-- ====================================

-- Ver estado actual de los datos
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN id_chofer IS NOT NULL THEN 1 END) as con_chofer,
  COUNT(CASE WHEN id_camion IS NOT NULL THEN 1 END) as con_camion,
  COUNT(CASE WHEN length(id_chofer::text) = 37 THEN 1 END) as chofer_37_chars,
  COUNT(CASE WHEN length(id_chofer::text) = 36 THEN 1 END) as chofer_36_chars,
  COUNT(CASE WHEN length(id_camion::text) = 37 THEN 1 END) as camion_37_chars,
  COUNT(CASE WHEN length(id_camion::text) = 36 THEN 1 END) as camion_36_chars
FROM viajes_despacho;

-- Verificar que los UUIDs truncados existen en las tablas
SELECT 
  'Choferes corruptos' as tipo,
  COUNT(*) as cantidad,
  COUNT(c.id) as matches_encontrados
FROM viajes_despacho vd
LEFT JOIN choferes c ON c.id::text = substring(vd.id_chofer::text, 1, 36)
WHERE vd.id_chofer IS NOT NULL 
  AND length(vd.id_chofer::text) = 37;

SELECT 
  'Camiones corruptos' as tipo,
  COUNT(*) as cantidad,
  COUNT(cam.id) as matches_encontrados
FROM viajes_despacho vd
LEFT JOIN camiones cam ON cam.id::text = substring(vd.id_camion::text, 1, 36)
WHERE vd.id_camion IS NOT NULL 
  AND length(vd.id_camion::text) = 37;

-- ====================================
-- PASO 2: MIGRACIÓN DE DATOS
-- ====================================

-- 2.1 Crear columnas temporales con el tipo correcto
ALTER TABLE viajes_despacho 
  ADD COLUMN IF NOT EXISTS id_chofer_new UUID,
  ADD COLUMN IF NOT EXISTS id_camion_new UUID,
  ADD COLUMN IF NOT EXISTS id_acoplado_new UUID;

-- 2.2 Migrar datos truncando UUIDs a 36 caracteres
UPDATE viajes_despacho
SET 
  id_chofer_new = CASE 
    WHEN id_chofer IS NOT NULL AND length(id_chofer::text) > 36 
    THEN substring(id_chofer::text, 1, 36)::uuid
    WHEN id_chofer IS NOT NULL AND length(id_chofer::text) = 36
    THEN id_chofer::uuid
    ELSE NULL
  END,
  id_camion_new = CASE 
    WHEN id_camion IS NOT NULL AND length(id_camion::text) > 36 
    THEN substring(id_camion::text, 1, 36)::uuid
    WHEN id_camion IS NOT NULL AND length(id_camion::text) = 36
    THEN id_camion::uuid
    ELSE NULL
  END,
  id_acoplado_new = CASE 
    WHEN id_acoplado IS NOT NULL AND length(id_acoplado::text) > 36 
    THEN substring(id_acoplado::text, 1, 36)::uuid
    WHEN id_acoplado IS NOT NULL AND length(id_acoplado::text) = 36
    THEN id_acoplado::uuid
    ELSE NULL
  END;

-- 2.3 Verificar migración
SELECT 
  'Post-migración' as etapa,
  COUNT(*) as total,
  COUNT(id_chofer_new) as choferes_migrados,
  COUNT(id_camion_new) as camiones_migrados,
  COUNT(id_acoplado_new) as acoplados_migrados
FROM viajes_despacho;

-- Verificar que no perdimos datos
SELECT 
  COUNT(*) as registros_con_diferencias
FROM viajes_despacho
WHERE (id_chofer IS NOT NULL AND id_chofer_new IS NULL)
   OR (id_camion IS NOT NULL AND id_camion_new IS NULL)
   OR (id_acoplado IS NOT NULL AND id_acoplado_new IS NULL);

-- ====================================
-- PASO 3: ELIMINAR FK CONSTRAINTS ANTIGUOS (si existen)
-- ====================================

-- Verificar constraints existentes
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('id_chofer', 'id_camion', 'id_acoplado');

-- Eliminar constraints (ajustar nombres según lo que devuelva la query anterior)
-- Ejemplo (ejecutar solo si existen):
-- ALTER TABLE viajes_despacho DROP CONSTRAINT IF EXISTS viajes_despacho_id_chofer_fkey;
-- ALTER TABLE viajes_despacho DROP CONSTRAINT IF EXISTS viajes_despacho_id_camion_fkey;
-- ALTER TABLE viajes_despacho DROP CONSTRAINT IF EXISTS viajes_despacho_id_acoplado_fkey;

-- ====================================
-- PASO 4: REEMPLAZAR COLUMNAS ANTIGUAS
-- ====================================

-- 4.1 Eliminar columnas antiguas
ALTER TABLE viajes_despacho 
  DROP COLUMN IF EXISTS id_chofer CASCADE,
  DROP COLUMN IF EXISTS id_camion CASCADE,
  DROP COLUMN IF EXISTS id_acoplado CASCADE;

-- 4.2 Renombrar columnas nuevas
ALTER TABLE viajes_despacho 
  RENAME COLUMN id_chofer_new TO id_chofer;

ALTER TABLE viajes_despacho 
  RENAME COLUMN id_camion_new TO id_camion;

ALTER TABLE viajes_despacho 
  RENAME COLUMN id_acoplado_new TO id_acoplado;

-- ====================================
-- PASO 5: AGREGAR FK CONSTRAINTS
-- ====================================

-- 5.1 Agregar foreign keys con ON DELETE SET NULL
ALTER TABLE viajes_despacho
  ADD CONSTRAINT fk_viajes_despacho_chofer 
    FOREIGN KEY (id_chofer) 
    REFERENCES choferes(id) 
    ON DELETE SET NULL;

ALTER TABLE viajes_despacho
  ADD CONSTRAINT fk_viajes_despacho_camion 
    FOREIGN KEY (id_camion) 
    REFERENCES camiones(id) 
    ON DELETE SET NULL;

ALTER TABLE viajes_despacho
  ADD CONSTRAINT fk_viajes_despacho_acoplado 
    FOREIGN KEY (id_acoplado) 
    REFERENCES acoplados(id) 
    ON DELETE SET NULL;

-- 5.2 Recrear índices (pueden haberse eliminado)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_chofer_id ON viajes_despacho(id_chofer);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_camion_id ON viajes_despacho(id_camion);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_acoplado_id ON viajes_despacho(id_acoplado);

-- ====================================
-- PASO 6: VALIDACIÓN POST-MIGRACIÓN
-- ====================================

-- 6.1 Verificar tipos de datos
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('id_chofer', 'id_camion', 'id_acoplado')
ORDER BY column_name;

-- 6.2 Verificar que todos los UUIDs son válidos (36 chars)
SELECT 
  'Validación final' as etapa,
  COUNT(*) as total,
  COUNT(CASE WHEN id_chofer IS NOT NULL AND length(id_chofer::text) = 36 THEN 1 END) as choferes_validos,
  COUNT(CASE WHEN id_camion IS NOT NULL AND length(id_camion::text) = 36 THEN 1 END) as camiones_validos,
  COUNT(CASE WHEN id_acoplado IS NOT NULL AND length(id_acoplado::text) = 36 THEN 1 END) as acoplados_validos,
  COUNT(CASE WHEN id_chofer IS NOT NULL AND length(id_chofer::text) != 36 THEN 1 END) as choferes_invalidos,
  COUNT(CASE WHEN id_camion IS NOT NULL AND length(id_camion::text) != 36 THEN 1 END) as camiones_invalidos,
  COUNT(CASE WHEN id_acoplado IS NOT NULL AND length(id_acoplado::text) != 36 THEN 1 END) as acoplados_invalidos
FROM viajes_despacho;

-- 6.3 Verificar relaciones funcionan correctamente
SELECT 
  vd.numero_viaje,
  vd.id_chofer,
  c.nombre || ' ' || c.apellido as chofer,
  vd.id_camion,
  cam.patente as camion
FROM viajes_despacho vd
LEFT JOIN choferes c ON c.id = vd.id_chofer
LEFT JOIN camiones cam ON cam.id = vd.id_camion
WHERE vd.id_chofer IS NOT NULL OR vd.id_camion IS NOT NULL
LIMIT 10;

-- 6.4 Verificar constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'viajes_despacho'
  AND kcu.column_name IN ('id_chofer', 'id_camion', 'id_acoplado');

-- ====================================
-- PASO 7: LIMPIAR (OPCIONAL)
-- ====================================

-- Si todo está OK, puedes eliminar el backup después de algunos días:
-- DROP TABLE IF EXISTS viajes_despacho_backup_20251229;

-- ====================================
-- RESUMEN DE EJECUCIÓN
-- ====================================

-- 1. Ejecutar PASO 0 (backup)
-- 2. Ejecutar PASO 1 (análisis)
-- 3. Ejecutar PASO 2 (migración)
-- 4. Ejecutar PASO 3 (eliminar constraints)
-- 5. Ejecutar PASO 4 (reemplazar columnas)
-- 6. Ejecutar PASO 5 (agregar constraints)
-- 7. Ejecutar PASO 6 (validación)
-- 8. Si todo OK, actualizar código TypeScript
-- 9. Testing completo
-- 10. Después de varios días sin issues, ejecutar PASO 7 (limpiar backup)

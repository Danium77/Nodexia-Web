-- ============================================================================
-- DEBUG: Verificar unidades operativas del chofer Walter Daniel Zayas
-- ============================================================================
-- EJECUTAR EN PROD: lkdcofsfjnltuzzzwoir.supabase.co
-- ============================================================================

-- 1. Buscar el chofer por DNI
SELECT 
  id,
  nombre,
  apellido,
  dni,
  empresa_id,
  (SELECT nombre FROM empresas WHERE id = choferes.empresa_id) as empresa_nombre
FROM choferes 
WHERE dni = '28848617';

-- 2. Buscar unidades operativas asociadas a ese chofer
-- Usar el ID del chofer obtenido arriba
SELECT 
  uo.id,
  uo.codigo,
  uo.nombre,
  uo.activo,
  uo.chofer_id,
  uo.camion_id,
  uo.acoplado_id,
  uo.empresa_id,
  e.nombre as empresa_nombre,
  c.patente as camion_patente,
  a.patente as acoplado_patente,
  uo.created_at,
  uo.updated_at
FROM unidades_operativas uo
LEFT JOIN empresas e ON e.id = uo.empresa_id
LEFT JOIN camiones c ON c.id = uo.camion_id
LEFT JOIN acoplados a ON a.id = uo.acoplado_id
WHERE uo.chofer_id IN (
  SELECT id FROM choferes WHERE dni = '28848617'
)
ORDER BY uo.activo DESC, uo.nombre;

-- 3. SOLUCIÓN: Si hay unidades inactivas que ya no se usan, ELIMINARLAS
-- Descomenta y ejecuta esto para eliminar la unidad operativa inactiva:

/*
DELETE FROM unidades_operativas 
WHERE id = 'PEGAR_ID_DE_LA_UNIDAD_AQUI';
*/

-- 4. Verificar que ya no existan unidades operativas para ese chofer
SELECT COUNT(*) as total_unidades
FROM unidades_operativas 
WHERE chofer_id IN (SELECT id FROM choferes WHERE dni = '28848617');

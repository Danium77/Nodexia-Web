-- ============================================================================
-- LIMPIAR CHOFERES INSERTADOS MANUALMENTE
-- Elimina choferes sin usuario_id (insertados incorrectamente)
-- ============================================================================

-- 1. Ver qué se va a eliminar (VERIFICACIÓN)
SELECT 
  id,
  nombre,
  apellido,
  dni,
  telefono,
  usuario_id,
  '⚠️ SERÁ ELIMINADO' as accion
FROM choferes
WHERE usuario_id IS NULL;

-- 2. ELIMINAR choferes sin usuario_id
-- ⚠️ CUIDADO: Esta acción NO se puede deshacer
DELETE FROM choferes
WHERE usuario_id IS NULL;

-- 3. Verificar que se eliminaron correctamente
SELECT COUNT(*) as choferes_restantes
FROM choferes;

-- 4. Ver choferes que quedaron (solo los válidos)
SELECT 
  c.id,
  c.nombre,
  c.apellido,
  c.dni,
  ue.nombre_completo,
  e.nombre as empresa
FROM choferes c
LEFT JOIN usuarios_empresa ue ON c.usuario_id = ue.user_id
LEFT JOIN empresas e ON c.id_transporte = e.id;

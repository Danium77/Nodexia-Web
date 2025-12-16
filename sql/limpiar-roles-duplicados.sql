-- Limpiar roles duplicados o incorrectos
-- Mantener solo roles válidos y bien configurados

-- 1. Ver roles duplicados o problemáticos
SELECT 
  id,
  nombre,
  nombre_rol,
  tipo_empresa,
  activo,
  CASE 
    WHEN nombre_rol = 'Chofer' AND tipo_empresa = 'ambos' THEN '❌ ELIMINAR - Duplicado con mayúscula'
    WHEN nombre_rol = 'chofer' AND tipo_empresa = 'transporte' THEN '✅ MANTENER - Correcto'
    WHEN nombre_rol = 'Chofer' AND tipo_empresa = 'transporte' THEN '⚠️ REVISAR - Mayúscula incorrecta'
    ELSE '✅ OK'
  END as accion
FROM roles_empresa
WHERE nombre_rol ILIKE '%chofer%'
ORDER BY nombre_rol, tipo_empresa;

-- 2. Verificar si hay usuarios usando los roles a eliminar
SELECT 
  re.nombre_rol,
  re.tipo_empresa,
  COUNT(ue.id) as usuarios_usando_rol
FROM roles_empresa re
LEFT JOIN usuarios_empresa ue ON ue.rol_empresa_id = re.id
WHERE re.nombre_rol = 'Chofer' AND re.tipo_empresa = 'ambos'
GROUP BY re.id, re.nombre_rol, re.tipo_empresa;

-- 3. ELIMINAR rol duplicado "Chofer" con mayúscula (tipo ambos)
-- Solo si NO hay usuarios usando este rol
DO $$
DECLARE
  v_rol_id UUID;
  v_usuarios_count INT;
BEGIN
  -- Buscar el rol problemático
  SELECT id INTO v_rol_id
  FROM roles_empresa
  WHERE nombre_rol = 'Chofer' AND tipo_empresa = 'ambos';
  
  IF v_rol_id IS NOT NULL THEN
    -- Verificar si hay usuarios usando este rol
    SELECT COUNT(*) INTO v_usuarios_count
    FROM usuarios_empresa
    WHERE rol_empresa_id = v_rol_id;
    
    IF v_usuarios_count = 0 THEN
      -- Eliminar el rol
      DELETE FROM roles_empresa WHERE id = v_rol_id;
      RAISE NOTICE '✅ Rol "Chofer" (ambos) eliminado - sin usuarios asignados';
    ELSE
      -- Solo desactivar si hay usuarios
      UPDATE roles_empresa SET activo = false WHERE id = v_rol_id;
      RAISE NOTICE '⚠️ Rol "Chofer" (ambos) desactivado - tiene % usuarios asignados', v_usuarios_count;
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Rol "Chofer" (ambos) no encontrado';
  END IF;
END;
$$;

-- 4. Verificación final - Ver todos los roles activos para transporte
SELECT 
  id,
  nombre,
  nombre_rol,
  tipo_empresa,
  activo
FROM roles_empresa
WHERE tipo_empresa IN ('transporte', 'ambos')
  AND activo = true
ORDER BY tipo_empresa, nombre_rol;

-- 5. Contar usuarios por rol para asegurar que todo está correcto
SELECT 
  re.nombre_rol,
  re.tipo_empresa,
  re.activo,
  COUNT(ue.id) as cantidad_usuarios
FROM roles_empresa re
LEFT JOIN usuarios_empresa ue ON ue.rol_empresa_id = re.id
WHERE re.tipo_empresa IN ('transporte', 'ambos')
GROUP BY re.id, re.nombre_rol, re.tipo_empresa, re.activo
ORDER BY cantidad_usuarios DESC, re.nombre_rol;

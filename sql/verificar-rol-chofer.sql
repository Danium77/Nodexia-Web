-- Verificar roles disponibles para Chofer en empresa de transporte
SELECT 
  id,
  nombre,
  nombre_rol,
  tipo_empresa,
  activo
FROM roles_empresa
WHERE nombre_rol = 'chofer' OR nombre_rol ILIKE '%chofer%'
ORDER BY tipo_empresa;

-- Ver todos los roles disponibles para transporte
SELECT 
  id,
  nombre,
  nombre_rol,
  tipo_empresa,
  activo
FROM roles_empresa
WHERE tipo_empresa IN ('transporte', 'ambos')
  AND activo = true
ORDER BY nombre_rol;

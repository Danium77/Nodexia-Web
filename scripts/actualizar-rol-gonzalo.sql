-- Actualizar rol de gonzalo si necesario
-- Fecha: 21-Dic-2025
-- Solo ejecutar SI el rol está en formato antiguo

-- 1. Ver estado actual
SELECT 
  ue.id,
  ue.rol_interno,
  e.nombre AS empresa,
  e.tipo_empresa
FROM usuarios_empresa ue
JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.user_id = (SELECT id FROM auth.users WHERE email ILIKE '%gonzalo%')
  AND ue.activo = true;

-- 2. Actualizar rol si está en formato antiguo
-- SOLO ejecutar si el rol_interno es 'coordinador_transporte'
UPDATE usuarios_empresa
SET rol_interno = 'coordinador'
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%gonzalo%')
  AND rol_interno = 'coordinador_transporte'
  AND activo = true;

-- 3. Verificar actualización
SELECT 
  ue.id,
  ue.rol_interno,
  e.nombre AS empresa,
  e.tipo_empresa,
  'Debe mostrar: coordinador + tipo_empresa: transporte' AS nota
FROM usuarios_empresa ue
JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.user_id = (SELECT id FROM auth.users WHERE email ILIKE '%gonzalo%')
  AND ue.activo = true;

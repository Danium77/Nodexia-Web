-- ============================================================================
-- VERIFICACIÓN DE CHOFERES
-- Revisar integridad de datos entre choferes y usuarios
-- ============================================================================

-- 1. Ver todos los choferes con sus datos
SELECT 
  c.id,
  c.nombre,
  c.apellido,
  c.dni,
  c.telefono,
  c.usuario_id,
  c.id_transporte,
  c.created_at,
  -- Info del usuario vinculado (si existe)
  ue.nombre_completo as usuario_nombre,
  ue.email_interno as usuario_email,
  ue.rol_interno as usuario_rol,
  -- Info de la empresa de transporte
  e.nombre as empresa_transporte
FROM choferes c
LEFT JOIN usuarios_empresa ue ON c.usuario_id = ue.user_id
LEFT JOIN empresas e ON c.id_transporte = e.id
ORDER BY c.created_at DESC;

-- 2. Choferes SIN usuario vinculado (problema)
SELECT 
  c.id,
  c.nombre,
  c.apellido,
  c.dni,
  c.telefono,
  c.id_transporte,
  e.nombre as empresa_transporte,
  '⚠️ NO tiene usuario vinculado' as problema
FROM choferes c
LEFT JOIN empresas e ON c.id_transporte = e.id
WHERE c.usuario_id IS NULL;

-- 3. Choferes de Logística Express específicamente
SELECT 
  c.id,
  c.nombre,
  c.apellido,
  c.dni,
  c.usuario_id,
  ue.nombre_completo,
  ue.email_interno,
  CASE 
    WHEN c.usuario_id IS NULL THEN '❌ Sin usuario'
    ELSE '✅ Con usuario'
  END as estado
FROM choferes c
LEFT JOIN usuarios_empresa ue ON c.usuario_id = ue.user_id
LEFT JOIN empresas e ON c.id_transporte = e.id
WHERE e.nombre ILIKE '%logistica express%';

-- 4. Usuarios con rol chofer en la tabla usuarios_empresa
SELECT 
  ue.user_id,
  ue.nombre_completo,
  ue.dni,
  ue.email_interno,
  ue.rol_interno,
  e.nombre as empresa,
  -- Verificar si está vinculado en tabla choferes
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Vinculado'
    ELSE '⚠️ No vinculado en choferes'
  END as estado_vinculacion
FROM usuarios_empresa ue
JOIN empresas e ON ue.empresa_id = e.id
LEFT JOIN choferes c ON ue.user_id = c.usuario_id
WHERE ue.rol_interno = 'chofer'
AND ue.activo = true;

-- ============================================================================
-- VERIFICAR: Empresa a la que pertenecen los choferes
-- ============================================================================
-- Verificar si '032b4d7f-18b4-4722-8fa4-2e7d723138f5' es una empresa válida
-- ============================================================================

-- 1. Buscar la empresa misteriosa
SELECT 
  id,
  nombre,
  tipo_empresa,
  cuit,
  direccion,
  created_at
FROM empresas
WHERE id = '032b4d7f-18b4-4722-8fa4-2e7d723138f5';

-- 2. Ver TODAS las empresas de transporte en la red
SELECT 
  id,
  nombre,
  tipo_empresa,
  cuit
FROM empresas
WHERE tipo_empresa = 'transporte'
ORDER BY nombre;

-- 3. Ver relación entre empresas (si existe red colaborativa)
SELECT 
  re.*,
  e1.nombre as empresa_cliente,
  e2.nombre as empresa_transporte
FROM relaciones_empresas re
LEFT JOIN empresas e1 ON e1.id = re.empresa_cliente_id
LEFT JOIN empresas e2 ON e2.id = re.empresa_transporte_id
WHERE re.empresa_transporte_id = '032b4d7f-18b4-4722-8fa4-2e7d723138f5'
   OR re.empresa_transporte_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';

-- 4. Ver todos los choferes con su empresa
SELECT 
  c.nombre,
  c.apellido,
  c.dni,
  c.empresa_id,
  e.nombre as empresa_nombre,
  e.tipo_empresa
FROM choferes c
LEFT JOIN empresas e ON e.id = c.empresa_id
ORDER BY c.apellido;

-- 5. Ver usuarios vinculados a ambas empresas
SELECT 
  ue.user_id,
  ue.empresa_id,
  u.email,
  e.nombre as empresa,
  ue.rol_interno
FROM usuarios_empresa ue
JOIN auth.users u ON u.id = ue.user_id
JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.empresa_id IN (
  '032b4d7f-18b4-4722-8fa4-2e7d723138f5',
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
)
ORDER BY e.nombre, u.email;

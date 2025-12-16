-- Verificar y actualizar el usuario admin@nodexia.com
-- ID del usuario: feb68b18-7667-48a7-aaa1-b48fa5e92ba5

-- PASO 1: Ver qué hay en profiles actualmente
SELECT * FROM profiles WHERE id = 'feb68b18-7667-48a7-aaa1-b48fa5e92ba5';

-- PASO 2: Ver en usuarios_empresa
SELECT * FROM usuarios_empresa WHERE user_id = 'feb68b18-7667-48a7-aaa1-b48fa5e92ba5';

-- PASO 3: Actualizar rol_interno en usuarios_empresa a super_admin
UPDATE usuarios_empresa 
SET rol_interno = 'super_admin'
WHERE user_id = 'feb68b18-7667-48a7-aaa1-b48fa5e92ba5';

-- PASO 4: Verificar la actualización
SELECT 
  ue.user_id,
  ue.rol_interno,
  ue.activo,
  ue.nombre_completo,
  e.nombre as empresa_nombre,
  u.email
FROM usuarios_empresa ue
LEFT JOIN empresas e ON e.id = ue.empresa_id
LEFT JOIN auth.users u ON u.id = ue.user_id
WHERE ue.user_id = 'feb68b18-7667-48a7-aaa1-b48fa5e92ba5';

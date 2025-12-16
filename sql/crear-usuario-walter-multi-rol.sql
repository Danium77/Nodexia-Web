-- ============================================
-- SCRIPT: Crear Usuario Walter Zayas en usuarios_multi_rol
-- FECHA: 24 de Noviembre 2025
-- PROPÓSITO: Habilitar acceso móvil para Walter Zayas (chofer)
-- ============================================

-- PASO 1: Verificar que el usuario existe en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE id = '50da5768-b203-4719-ad16-62e03e2b151a';
-- Resultado esperado: 1 fila con walter@logisticaexpress.com


-- PASO 2: Buscar el UUID de la empresa Logística Express
SELECT 
  id,
  nombre,
  cuit,
  tipo_empresa,
  activa
FROM empresas
WHERE nombre ILIKE '%logistica%express%'
   OR nombre ILIKE '%logistica express%';
-- Copiar el UUID que aparezca en el resultado


-- PASO 3: Verificar que NO existe un registro previo (debería estar vacía)
SELECT * FROM usuarios_multi_rol 
WHERE user_id = '50da5768-b203-4719-ad16-62e03e2b151a';
-- Resultado esperado: 0 filas


-- PASO 4: Crear el registro en usuarios_multi_rol
-- ⚠️ IMPORTANTE: Reemplazar '<UUID_EMPRESA>' con el UUID obtenido en PASO 2

INSERT INTO usuarios_multi_rol (
  user_id,
  empresa_id,
  empresa_nombre,
  tipo_empresa,
  roles,
  cantidad_roles,
  created_at,
  updated_at
)
VALUES (
  '50da5768-b203-4719-ad16-62e03e2b151a', -- UUID de Walter Zayas
  '<UUID_EMPRESA>',                        -- 🔴 REEMPLAZAR con UUID de Logística Express
  'Logística Express',
  'transporte',
  ARRAY['chofer']::text[],
  1,
  NOW(),
  NOW()
);


-- PASO 5: Verificar que el registro se creó correctamente
SELECT 
  user_id,
  empresa_id,
  empresa_nombre,
  tipo_empresa,
  roles,
  cantidad_roles,
  created_at
FROM usuarios_multi_rol 
WHERE user_id = '50da5768-b203-4719-ad16-62e03e2b151a';
-- Resultado esperado: 1 fila con rol ['chofer']


-- PASO 6: Verificar que Walter puede ver su empresa
-- Esta query simula lo que hará el sistema al cargar el dashboard
SELECT 
  umr.user_id,
  umr.empresa_id,
  umr.empresa_nombre,
  umr.tipo_empresa,
  umr.roles,
  e.nombre as empresa_verificada,
  e.activa as empresa_activa
FROM usuarios_multi_rol umr
JOIN empresas e ON e.id = umr.empresa_id
WHERE umr.user_id = '50da5768-b203-4719-ad16-62e03e2b151a';
-- Resultado esperado: 1 fila con JOIN exitoso


-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. La tabla usuarios_multi_rol es la que determina acceso al sistema
-- 2. Un usuario puede tener múltiples roles en la misma empresa
-- 3. Si necesitas agregar más roles en el futuro:
--    UPDATE usuarios_multi_rol 
--    SET roles = ARRAY['chofer', 'control_acceso']::text[],
--        cantidad_roles = 2
--    WHERE user_id = '50da5768-b203-4719-ad16-62e03e2b151a';
--
-- 4. Para verificar políticas RLS:
--    SELECT * FROM usuarios_multi_rol; -- Debería filtrar por usuario actual
--
-- ============================================
-- CREDENCIALES DE PRUEBA:
-- ============================================
-- Email: walter@logisticaexpress.com
-- Password: (la que se configuró al crear el usuario)
-- URL: http://localhost:3000/chofer-mobile
-- ============================================

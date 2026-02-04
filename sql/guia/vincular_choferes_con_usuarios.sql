-- ============================================================================
-- VINCULAR CHOFERES EXISTENTES CON USUARIOS DE NODEXIA
-- ============================================================================
-- Objetivo: Permitir que choferes que ya existen en la tabla puedan
--           hacer login en la app móvil
-- ============================================================================

-- PASO 1: Ver los choferes que NO tienen usuario vinculado
SELECT 
  id,
  nombre,
  apellido,
  dni,
  telefono,
  email,
  usuario_id,
  CASE 
    WHEN usuario_id IS NOT NULL THEN '✓ Tiene usuario'
    ELSE '❌ Sin usuario'
  END as estado
FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY apellido;

-- ============================================================================
-- PASO 2: CREAR USUARIOS EN SUPABASE AUTH (Manual en Dashboard)
-- ============================================================================
-- Ir a: Supabase Dashboard → Authentication → Users → "Add user"
--
-- Para cada chofer, crear usuario con:
-- - Email: dni@chofer.nodexia.com  (ej: 33379498@chofer.nodexia.com)
-- - Password: generar una temporal o usar el DNI
-- - Email Confirmed: ✓ (marcar como confirmado)
--
-- Anotar los UUID generados para cada usuario
-- ============================================================================

-- PASO 3: Crear registros en usuarios_empresa
-- (Reemplazar los UUIDs con los que se generaron en el paso anterior)

-- Ejemplo para Luis Fernández Demo (DNI: 33379498)
INSERT INTO usuarios_empresa (
  user_id,
  empresa_id,
  nombre_completo,
  email_interno,
  telefono_interno,
  dni,
  rol_interno,
  activo
) VALUES (
  '[UUID-del-usuario-creado-en-auth]',  -- Reemplazar con UUID real
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed',  -- Logística Express
  'Luis Fernández Demo',
  '33379498@chofer.nodexia.com',
  '+54 9 11 5297-6900',
  '33379498',
  'chofer',
  true
);

-- Repetir para Carlos González Demo (DNI: 35756372)
INSERT INTO usuarios_empresa (
  user_id,
  empresa_id,
  nombre_completo,
  email_interno,
  telefono_interno,
  dni,
  rol_interno,
  activo
) VALUES (
  '[UUID-del-usuario-carlos]',  -- Reemplazar
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed',
  'Carlos González Demo',
  '35756372@chofer.nodexia.com',
  '+54 9 11 8800-3974',
  '35756372',
  'chofer',
  true
);

-- PASO 4: Vincular los usuarios con los choferes existentes
-- (Actualizar la columna usuario_id en la tabla choferes)

UPDATE choferes
SET usuario_id = '[UUID-del-usuario-luis]'
WHERE dni = '33379498';

UPDATE choferes
SET usuario_id = '[UUID-del-usuario-carlos]'
WHERE dni = '35756372';

-- PASO 5: Verificar que todo quedó vinculado correctamente
SELECT 
  c.nombre,
  c.apellido,
  c.dni,
  c.usuario_id,
  u.email as email_login,
  ue.rol_interno
FROM choferes c
LEFT JOIN auth.users u ON u.id = c.usuario_id
LEFT JOIN usuarios_empresa ue ON ue.user_id = c.usuario_id
WHERE c.empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY c.apellido;

-- ============================================================================
-- TESTING: Probar login en app móvil
-- ============================================================================
-- URL: /chofer-mobile
-- Usuario: 33379498@chofer.nodexia.com
-- Password: [la que configuraste]
-- ============================================================================

-- ============================================================================
-- LIMPIAR CHOFERES Y EMPEZAR DE CERO (AMBIENTE DEV)
-- ============================================================================
-- Proceso: Borrar choferes existentes para recrearlos desde Admin Nodexia
-- ============================================================================

-- 1. Ver los choferes actuales antes de borrar
SELECT id, nombre, apellido, dni, empresa_id
FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY apellido;

-- 2. Borrar choferes de Logística Express
-- (Esto NO borrará viajes ni despachos, solo los registros de choferes)
DELETE FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';

-- 3. Verificar que se borraron
SELECT COUNT(*) as choferes_restantes
FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';
-- Debería mostrar 0

-- ============================================================================
-- AHORA IR A ADMIN NODEXIA Y CREAR CHOFERES
-- ============================================================================
-- URL: /admin/usuarios
--
-- Para cada chofer crear:
-- 1. Click "Agregar Usuario"
-- 2. Llenar formulario:
--    - Nombre Completo: Walter Daniel Zayas
--    - Email: walter.zayas@logisticaexpres.com (o 28848617@chofer.nodexia.com)
--    - DNI: 28848617
--    - Teléfono: +54 11 27669000
--    - Rol: Chofer
--    - Empresa: Logística Express SRL
--    - Password: [generar o usar DNI]
--    - ✓ Activo
-- 3. Guardar
--
-- Repetir para:
-- - Luis Fernández Demo (DNI: 33379498)
-- - Carlos González Demo (DNI: 35756372)
-- ============================================================================

-- 4. Después de crear todos, verificar que se crearon correctamente
SELECT 
  c.nombre,
  c.apellido,
  c.dni,
  c.telefono,
  c.usuario_id,
  u.email,
  ue.rol_interno
FROM choferes c
LEFT JOIN auth.users u ON u.id = c.usuario_id
LEFT JOIN usuarios_empresa ue ON ue.user_id = c.usuario_id AND ue.empresa_id = c.empresa_id
WHERE c.empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY c.apellido;

-- Deberías ver:
-- ✓ usuario_id lleno (no NULL)
-- ✓ email del usuario
-- ✓ rol_interno = 'chofer'

-- ============================================================================
-- TESTING
-- ============================================================================
-- 1. Ir a /transporte/flota?tab=choferes → Deberían aparecer todos
-- 2. Ir a /chofer-mobile → Login con email y password
-- 3. Ver viaje asignado (si existe)
-- ============================================================================

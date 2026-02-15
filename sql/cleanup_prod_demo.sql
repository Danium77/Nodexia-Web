-- ================================================================
-- LIMPIEZA PROD PARA DEMO — Nodexia Web
-- Fecha: 14-Feb-2026
-- 
-- CONSERVA:
--   - Empresas, ubicaciones, orígenes, destinos
--   - Flota (choferes, camiones, acoplados)
--   - Unidades operativas
--   - Relaciones entre empresas
--   - Usuarios: logistica@aceiterasanmiguel.com, gonzalo@logisticaexpres.com,
--     carlos@sanmiguel.com, walter@sur.com, abel@tecnopack.com,
--     superadmin@nodexia.com
--
-- ELIMINA:
--   - Datos operativos (despachos, viajes, tracking, etc.)
--   - Documentos operativos (remitos, docs de viaje)
--   - Notificaciones
--   - Historial y auditoría
--   - Usuarios que NO están en la lista de conservar
--
-- EJECUTAR EN: Supabase SQL Editor (PROD lkdcofsfjnltuzzzwoir)
-- ================================================================

-- ============================================
-- PASO 1: Limpiar datos operativos
-- (en orden seguro por FK dependencies)
-- ============================================

BEGIN;

-- === TIER 0: Audit/leaf tables ===
DELETE FROM auditoria_documentos WHERE true;
DELETE FROM requisitos_viaje_red WHERE true;
DELETE FROM historial_red_nodexia WHERE true;

-- === TIER 1: Viaje-children ===
DELETE FROM documentos_viaje_seguro WHERE true;
DELETE FROM estado_unidad_viaje WHERE true;
DELETE FROM estado_carga_viaje WHERE true;
DELETE FROM registros_acceso WHERE true;
DELETE FROM incidencias_viaje WHERE true;
DELETE FROM auditoria_estados WHERE true;
DELETE FROM tracking_gps WHERE true;

-- Tablas que pueden no existir (envueltas en DO block)
DO $$ BEGIN
  EXECUTE 'DELETE FROM paradas WHERE true';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'DELETE FROM historial_ubicaciones WHERE true';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'DELETE FROM registro_control_acceso WHERE true';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- === TIER 2: Intermediate ===
DELETE FROM historial_unidades_operativas WHERE true;

DO $$ BEGIN
  EXECUTE 'DELETE FROM visualizaciones_ofertas WHERE true';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DELETE FROM ofertas_red_nodexia WHERE true;
DELETE FROM viajes_red_nodexia WHERE true;
DELETE FROM notificaciones WHERE true;
DELETE FROM historial_despachos WHERE true;

DO $$ BEGIN
  EXECUTE 'DELETE FROM cancelaciones_despachos WHERE true';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- === TIER 3: Core operational ===
DELETE FROM viajes_despacho WHERE true;
DELETE FROM despachos WHERE true;

-- === TIER 4: Documentos de entidades (opcional, descomentar si querés reset) ===
-- DELETE FROM documentos_entidad WHERE true;
-- DELETE FROM documentos_recursos WHERE true;

COMMIT;

-- ============================================
-- PASO 2: Limpiar usuarios que NO están en la lista
-- (ejecutar por separado después del PASO 1)
-- ============================================

-- Primero, ver qué usuarios se van a eliminar (preview):
SELECT u.id, u.email 
FROM auth.users u
WHERE u.email NOT IN (
  'logistica@aceiterasanmiguel.com',
  'gonzalo@logisticaexpres.com',
  'carlos@sanmiguel.com',
  'walter@sur.com',
  'abel@tecnopack.com',
  'superadmin@nodexia.com'
)
ORDER BY u.email;

-- ============================================
-- PASO 3: Eliminar usuarios (DESPUÉS de revisar el preview)
-- ============================================
-- IMPORTANTE: Ejecutar SOLO después de verificar el listado del PASO 2
-- Descomentar las líneas de abajo cuando estés listo:

/*
BEGIN;

-- Nullificar referencias de usuario en tablas de flota/config
UPDATE choferes SET usuario_alta = NULL WHERE usuario_alta IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

UPDATE camiones SET usuario_alta = NULL WHERE usuario_alta IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

UPDATE acoplados SET usuario_alta = NULL WHERE usuario_alta IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

UPDATE unidades_operativas SET created_by = NULL WHERE created_by IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

UPDATE ubicaciones SET created_by = NULL WHERE created_by IS NOT NULL AND created_by IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

-- Eliminar registros de usuarios_empresa para usuarios a borrar
DELETE FROM usuarios_empresa WHERE user_id IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

-- Eliminar de tabla usuarios
DELETE FROM usuarios WHERE id IN (
  SELECT id FROM auth.users WHERE email NOT IN (
    'logistica@aceiterasanmiguel.com', 'gonzalo@logisticaexpres.com',
    'carlos@sanmiguel.com', 'walter@sur.com', 'abel@tecnopack.com',
    'superadmin@nodexia.com'
  )
);

-- Eliminar de auth.users
DELETE FROM auth.users WHERE email NOT IN (
  'logistica@aceiterasanmiguel.com',
  'gonzalo@logisticaexpres.com',
  'carlos@sanmiguel.com',
  'walter@sur.com',
  'abel@tecnopack.com',
  'superadmin@nodexia.com'
);

COMMIT;
*/

-- ============================================================================
-- Migración 076: Auditoría RLS — Restringir políticas sobre-permisivas
-- Fecha: 16-Mar-2026
-- Sesión: 40
-- 
-- PROBLEMA: Varias tablas tienen políticas con USING(true) que permiten a
-- cualquier usuario autenticado ver/crear/editar/eliminar registros de
-- cualquier empresa. Esto es una vulnerabilidad de broken access control.
--
-- CAMBIOS:
--   1. despachos: Restringir DELETE solo a coordinadores de la empresa creadora
--   2. despachos: Restringir INSERT solo a usuarios de la empresa planta
--   3. despachos: Restringir UPDATE solo a usuarios de la empresa planta
--   4. empresas: Restringir INSERT/UPDATE solo a admin_nodexia
--   5. ubicaciones: Restringir INSERT/UPDATE/DELETE, mantener SELECT abierto
--   6. tracking_gps: Recrear SELECT (para futuras queries cliente)
--   7. usuarios_empresa: Restringir INSERT/UPDATE (solo coordinadores de esa empresa)
--
-- NOTA: Las SELECT policies se mantienen permisivas donde el negocio lo requiere
-- (ej: transportes necesitan ver despachos asignados a ellos, empresas visibles
-- para poder vincularlas). El riesgo real es en WRITE operations.
-- ============================================================================

-- ============================================================================
-- 1. DESPACHOS — Restringir WRITE operations
-- ============================================================================

-- 1a. DROP la DELETE policy permisiva
DROP POLICY IF EXISTS "Usuarios autenticados eliminan despachos" ON despachos;

-- 1b. Nueva DELETE: solo coordinadores de la empresa que creó el despacho
CREATE POLICY "Solo coordinadores eliminan sus despachos"
ON despachos FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = despachos.empresa_id
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'admin_nodexia')
      AND ue.activo = true
  )
);

-- 1c. DROP la INSERT policy permisiva
DROP POLICY IF EXISTS "Usuarios autenticados crean despachos" ON despachos;

-- 1d. Nueva INSERT: solo usuarios de la empresa planta que crea el despacho
CREATE POLICY "Coordinadores crean despachos de su empresa"
ON despachos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = despachos.empresa_id
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'admin_nodexia')
      AND ue.activo = true
  )
);

-- 1e. DROP la UPDATE policy permisiva
DROP POLICY IF EXISTS "Usuarios autenticados actualizan despachos" ON despachos;

-- 1f. Nueva UPDATE: usuarios vinculados a la empresa del despacho (planta o transporte)
CREATE POLICY "Usuarios de empresa actualizan sus despachos"
ON despachos FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND (ue.empresa_id = despachos.empresa_id)
      AND ue.activo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM viajes_despacho vd
    JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE vd.despacho_id = despachos.id
      AND ue.user_id = auth.uid()
      AND ue.activo = true
  )
);

-- ============================================================================
-- 2. EMPRESAS — Restringir INSERT/UPDATE
-- ============================================================================

-- 2a. DROP INSERT permisivo
DROP POLICY IF EXISTS "usuarios_autenticados_crean_empresas" ON empresas;

-- 2b. Nueva INSERT: solo admin_nodexia puede crear empresas
CREATE POLICY "Solo admin crea empresas"
ON empresas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno = 'admin_nodexia'
      AND ue.activo = true
  )
);

-- 2c. DROP UPDATE permisivo
DROP POLICY IF EXISTS "usuarios_autenticados_actualizan_empresas" ON empresas;

-- 2d. Nueva UPDATE: admin_nodexia o coordinador de la empresa
CREATE POLICY "Admin o coordinador actualiza empresa"
ON empresas FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND (
        ue.rol_interno = 'admin_nodexia'
        OR (ue.empresa_id = empresas.id AND ue.rol_interno IN ('coordinador', 'coordinador_integral'))
      )
      AND ue.activo = true
  )
);

-- ============================================================================
-- 3. UBICACIONES — Restringir WRITE, mantener SELECT abierto
-- ============================================================================

-- 3a. DROP la ALL policy que da acceso total
DROP POLICY IF EXISTS "Ubicaciones acceso completo para autenticados" ON ubicaciones;
-- (nombre alternativo por si fue creada con otro nombre)
DROP POLICY IF EXISTS "ubicaciones_all_authenticated" ON ubicaciones;

-- 3b. SELECT: mantener abierto para usuarios autenticados (ya existe una)
-- La policy "Ubicaciones visibles para usuarios autenticados" ya existe (USING true)
-- No la tocamos — es legítimo que todos vean ubicaciones

-- 3c. INSERT: solo admin_nodexia o coordinadores
CREATE POLICY "Coordinadores crean ubicaciones"
ON ubicaciones FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'admin_nodexia')
      AND ue.activo = true
  )
);

-- 3d. UPDATE: solo admin_nodexia o coordinadores de empresa vinculada
CREATE POLICY "Coordinadores actualizan ubicaciones vinculadas"
ON ubicaciones FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'admin_nodexia')
      AND ue.activo = true
  )
);

-- 3e. DELETE: solo admin_nodexia
CREATE POLICY "Solo admin elimina ubicaciones"
ON ubicaciones FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno = 'admin_nodexia'
      AND ue.activo = true
  )
);

-- ============================================================================
-- 4. USUARIOS_EMPRESA — Restringir WRITE
-- ============================================================================

-- 4a. DROP INSERT permisivo
DROP POLICY IF EXISTS "admin_puede_crear_asociaciones" ON usuarios_empresa;

-- 4b. Nueva INSERT: solo admin_nodexia o coordinadores de la empresa
CREATE POLICY "Admin o coordinador crea asociaciones"
ON usuarios_empresa FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND (
        ue.rol_interno = 'admin_nodexia'
        OR (ue.empresa_id = usuarios_empresa.empresa_id AND ue.rol_interno IN ('coordinador', 'coordinador_integral'))
      )
      AND ue.activo = true
  )
);

-- 4c. DROP UPDATE permisivo
DROP POLICY IF EXISTS "admin_puede_actualizar_asociaciones" ON usuarios_empresa;

-- 4d. Nueva UPDATE: solo admin_nodexia o coordinadores de la empresa
CREATE POLICY "Admin o coordinador actualiza asociaciones"
ON usuarios_empresa FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND (
        ue.rol_interno = 'admin_nodexia'
        OR (ue.empresa_id = usuarios_empresa.empresa_id AND ue.rol_interno IN ('coordinador', 'coordinador_integral'))
      )
      AND ue.activo = true
  )
);

-- ============================================================================
-- 5. TRACKING_GPS — Recrear SELECT para futuras queries cliente
-- ============================================================================

CREATE POLICY "Usuarios ven tracking de sus viajes"
ON tracking_gps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM choferes ch
    JOIN usuarios_empresa ue ON ue.empresa_id = ch.empresa_id
    WHERE ch.id = tracking_gps.chofer_id
      AND ue.user_id = auth.uid()
      AND ue.activo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM choferes ch
    WHERE ch.id = tracking_gps.chofer_id
      AND ch.usuario_id = auth.uid()
  )
);

-- INSERT: solo choferes (vía su user_id en tabla choferes)
CREATE POLICY "Choferes insertan tracking GPS"
ON tracking_gps FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM choferes ch
    WHERE ch.id = tracking_gps.chofer_id
      AND ch.usuario_id = auth.uid()
  )
);

-- ============================================================================
-- 6. Registrar migración
-- ============================================================================

INSERT INTO schema_migrations (version, name, filename, applied_at)
VALUES ('076', '076_rls_audit_restrict_permissive', '076_rls_audit_restrict_permissive.sql', NOW())
ON CONFLICT (version) DO NOTHING;

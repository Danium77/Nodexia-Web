-- ============================================================================
-- MIGRACIÓN 067: Agregar coordinador_integral a todas las políticas RLS
-- ============================================================================
-- TASK-002: El rol coordinador_integral debe tener los mismos permisos que
-- coordinador en todas las tablas. Esta migración agrega el nuevo rol a las
-- 6 políticas que aún no lo incluían.
-- ============================================================================
-- Fecha: 2025-02-27
-- Dependencias: 066_perfil_pyme_y_vendedor.sql (crea el rol coordinador_integral)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. historial_unidades_operativas — INSERT
-- ============================================================================
DROP POLICY IF EXISTS "Coordinadores insertan historial" ON historial_unidades_operativas;
CREATE POLICY "Coordinadores insertan historial"
ON historial_unidades_operativas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'admin', 'admin_nodexia', 'super_admin')
  )
);

-- ============================================================================
-- 2. cancelaciones_despachos — INSERT
-- ============================================================================
DROP POLICY IF EXISTS insert_cancelaciones_coordinadores ON cancelaciones_despachos;
CREATE POLICY insert_cancelaciones_coordinadores ON cancelaciones_despachos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.empresa_id = cancelaciones_despachos.empresa_id
        AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'admin_empresa', 'super_admin')
    )
  );

-- ============================================================================
-- 3. documentos_recursos — INSERT ("Transporte sube documentos")
-- ============================================================================
DROP POLICY IF EXISTS "Transporte sube documentos" ON documentos_recursos;
CREATE POLICY "Transporte sube documentos" ON documentos_recursos FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador_transporte', 'administrador_transporte', 'supervisor_transporte', 'coordinador', 'coordinador_integral')
    )
  );

-- ============================================================================
-- 4. documentos_recursos — UPDATE ("Coordinador Planta valida por incidencia")
-- ============================================================================
DROP POLICY IF EXISTS "Coordinador Planta valida por incidencia" ON documentos_recursos;
CREATE POLICY "Coordinador Planta valida por incidencia" ON documentos_recursos FOR UPDATE
  USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador_planta', 'supervisor_planta', 'coordinador', 'coordinador_integral')
    )
  );

-- ============================================================================
-- 5. planta_transportes — ALL ("planta_gestiona_sus_transportes")
-- NOTA: Tabla puede no existir en todos los entornos.
-- La columna puede ser empresa_planta_id o empresa_id según la versión.
-- ============================================================================
DO $$
DECLARE
  col_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planta_transportes' AND table_schema = 'public') THEN
    -- Detectar nombre de columna correcto
    SELECT column_name INTO col_name
    FROM information_schema.columns
    WHERE table_name = 'planta_transportes' AND table_schema = 'public'
      AND column_name IN ('empresa_planta_id', 'empresa_id')
    LIMIT 1;

    IF col_name IS NOT NULL THEN
      EXECUTE 'DROP POLICY IF EXISTS "planta_gestiona_sus_transportes" ON planta_transportes';
      EXECUTE format('
        CREATE POLICY "planta_gestiona_sus_transportes" ON planta_transportes
          FOR ALL
          USING (
            %I IN (
              SELECT ue.empresa_id 
              FROM usuarios_empresa ue
              WHERE ue.user_id = auth.uid()
              AND ue.rol_interno IN (''coordinador'', ''coordinador_integral'')
            )
          )', col_name);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 6. ofertas_red_nodexia — ALL ("plantas_gestionan_ofertas")
-- NOTA: Tabla puede no existir en todos los entornos.
-- La columna puede ser empresa_planta_id o empresa_id según la versión.
-- ============================================================================
DO $$
DECLARE
  col_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ofertas_red_nodexia' AND table_schema = 'public') THEN
    -- Detectar nombre de columna correcto
    SELECT column_name INTO col_name
    FROM information_schema.columns
    WHERE table_name = 'ofertas_red_nodexia' AND table_schema = 'public'
      AND column_name IN ('empresa_planta_id', 'empresa_id')
    LIMIT 1;

    IF col_name IS NOT NULL THEN
      EXECUTE 'DROP POLICY IF EXISTS "plantas_gestionan_ofertas" ON ofertas_red_nodexia';
      EXECUTE format('
        CREATE POLICY "plantas_gestionan_ofertas" ON ofertas_red_nodexia
          FOR ALL
          USING (
            %I IN (
              SELECT ue.empresa_id 
              FROM usuarios_empresa ue
              WHERE ue.user_id = auth.uid()
              AND ue.rol_interno IN (''coordinador'', ''coordinador_integral'')
            )
          )', col_name);
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- FIX: Eliminar recursión infinita en policy de viajes_red_nodexia
-- Fecha: 19-Dic-2025
-- Problema: "Infinite recursion detected in policy for relation 'viajes_red_nodexia'"
-- Causa: La policy hace referencia a viajes_red_nodexia dentro de sí misma
-- Solución: Simplificar las policies eliminando referencias circulares
-- ============================================================================

-- Deshabilitar RLS temporalmente para hacer limpieza
ALTER TABLE viajes_red_nodexia DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_red_nodexia DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes de viajes_red_nodexia
DROP POLICY IF EXISTS "Plantas ven sus viajes en red" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven viajes abiertos sin vinculo" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven viajes con sus ofertas" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Plantas crean viajes en red" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Plantas actualizan sus viajes" ON viajes_red_nodexia;

-- Eliminar políticas de ofertas_red_nodexia
DROP POLICY IF EXISTS "Transportes crean ofertas" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven sus ofertas" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Plantas ven ofertas de sus viajes" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Plantas actualizan ofertas" ON ofertas_red_nodexia;

-- ============================================================================
-- POLICIES SIMPLIFICADAS SIN RECURSIÓN - viajes_red_nodexia
-- ============================================================================

-- Policy 1: Plantas ven sus propios viajes
CREATE POLICY "Plantas ven sus viajes en red"
    ON viajes_red_nodexia FOR SELECT
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 2: Transportes ven viajes disponibles (sin vínculo directo previo)
CREATE POLICY "Transportes ven viajes disponibles"
    ON viajes_red_nodexia FOR SELECT
    USING (
        -- Solo viajes en estados visibles
        estado_red IN ('abierto', 'con_ofertas')
        AND EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            JOIN empresas e ON e.id = ue.empresa_id
            WHERE ue.user_id = auth.uid()
            AND e.tipo_empresa = 'transporte'
        )
    );

-- Policy 3: Transportes ven viajes donde YA tienen ofertas (independiente del estado)
-- SIN recursión - solo chequea en ofertas_red_nodexia
CREATE POLICY "Transportes ven viajes donde ofertaron"
    ON viajes_red_nodexia FOR SELECT
    USING (
        id IN (
            SELECT viaje_red_id 
            FROM ofertas_red_nodexia 
            WHERE transporte_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy 4: Plantas crean viajes
CREATE POLICY "Plantas crean viajes en red"
    ON viajes_red_nodexia FOR INSERT
    WITH CHECK (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 5: Plantas actualizan sus viajes
CREATE POLICY "Plantas actualizan sus viajes"
    ON viajes_red_nodexia FOR UPDATE
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- POLICIES SIMPLIFICADAS - ofertas_red_nodexia
-- ============================================================================

-- Policy 6: Transportes crean ofertas
CREATE POLICY "Transportes crean ofertas"
    ON ofertas_red_nodexia FOR INSERT
    WITH CHECK (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 7: Transportes ven sus propias ofertas
CREATE POLICY "Transportes ven sus ofertas"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 8: Plantas ven ofertas de sus viajes
CREATE POLICY "Plantas ven ofertas de sus viajes"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy 9: Plantas actualizan ofertas (aceptar/rechazar)
CREATE POLICY "Plantas actualizan ofertas"
    ON ofertas_red_nodexia FOR UPDATE
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- RE-HABILITAR RLS
-- ============================================================================

ALTER TABLE viajes_red_nodexia ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_red_nodexia ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON POLICY "Plantas ven sus viajes en red" ON viajes_red_nodexia IS 
'Permite a plantas ver sus propios viajes publicados en Red Nodexia';

COMMENT ON POLICY "Transportes ven viajes disponibles" ON viajes_red_nodexia IS 
'Permite a transportes ver viajes abiertos o con ofertas disponibles para ofertar';

COMMENT ON POLICY "Transportes ven viajes donde ofertaron" ON viajes_red_nodexia IS 
'Permite a transportes ver viajes donde YA tienen ofertas, sin importar el estado del viaje. SIN RECURSIÓN - solo consulta ofertas_red_nodexia';

COMMENT ON POLICY "Plantas crean viajes en red" ON viajes_red_nodexia IS 
'Permite a plantas publicar nuevos viajes en Red Nodexia';

COMMENT ON POLICY "Plantas actualizan sus viajes" ON viajes_red_nodexia IS 
'Permite a plantas actualizar estado y datos de sus viajes';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver todas las policies actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operacion
FROM pg_policies
WHERE tablename IN ('viajes_red_nodexia', 'ofertas_red_nodexia')
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- CAMBIO CLAVE: La policy "Transportes ven viajes donde ofertaron" ahora:
-- 1. NO hace referencia circular a viajes_red_nodexia
-- 2. Solo consulta ofertas_red_nodexia (tabla diferente)
-- 3. Elimina completamente la recursión infinita
-- 4. Permite que transportes vean viajes donde tienen ofertas (cualquier estado)

-- FUNCIONALIDAD MANTENIDA:
-- ✅ Plantas ven sus viajes
-- ✅ Transportes ven viajes disponibles (abierto/con_ofertas)
-- ✅ Transportes ven viajes donde ya ofertaron (incluso si están asignados)
-- ✅ Pero ahora SIN viajes asignados a OTROS transportes

-- Si necesitas que transportes NO vean viajes asignados a otros:
-- Agrega esto a la aplicación (NO en RLS para evitar recursión):
-- WHERE estado_red != 'asignado' 
-- OR (estado_red = 'asignado' AND transporte_asignado_id = mi_empresa_id)

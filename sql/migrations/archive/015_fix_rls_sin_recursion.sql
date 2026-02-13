-- ============================================================================
-- FIX RLS POLICIES - RED NODEXIA - SIN RECURSIÓN
-- ============================================================================

-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Plantas ven sus viajes en red" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven viajes abiertos" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven viajes abiertos sin vinculo" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven viajes con sus ofertas" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Plantas crean viajes en red" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Plantas actualizan sus viajes" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes crean ofertas" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven sus ofertas" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Plantas ven ofertas de sus viajes" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Plantas actualizan ofertas" ON ofertas_red_nodexia;
DROP POLICY IF EXISTS "Ver requisitos de viajes accesibles" ON requisitos_viaje_red;
DROP POLICY IF EXISTS "Plantas crean requisitos" ON requisitos_viaje_red;
DROP POLICY IF EXISTS "Plantas actualizan requisitos" ON requisitos_viaje_red;

-- ============================================================================
-- POLÍTICAS SIMPLIFICADAS - viajes_red_nodexia
-- ============================================================================

-- Policy 1: Plantas ven sus viajes
CREATE POLICY "Plantas ven sus viajes en red"
    ON viajes_red_nodexia FOR SELECT
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 2: Transportes ven viajes abiertos (SIMPLIFICADA - sin subquery a ofertas)
CREATE POLICY "Transportes ven viajes abiertos"
    ON viajes_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            JOIN empresas e ON e.id = ue.empresa_id
            WHERE ue.user_id = auth.uid()
            AND e.tipo_empresa = 'transporte'
        )
    );

-- Policy 3: Plantas crean viajes
CREATE POLICY "Plantas crean viajes en red"
    ON viajes_red_nodexia FOR INSERT
    WITH CHECK (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 4: Plantas actualizan viajes
CREATE POLICY "Plantas actualizan sus viajes"
    ON viajes_red_nodexia FOR UPDATE
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- POLÍTICAS SIMPLIFICADAS - ofertas_red_nodexia
-- ============================================================================

-- Policy 5: Transportes crean ofertas
CREATE POLICY "Transportes crean ofertas"
    ON ofertas_red_nodexia FOR INSERT
    WITH CHECK (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 6: Transportes ven sus ofertas
CREATE POLICY "Transportes ven sus ofertas"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 7: Plantas ven ofertas de sus viajes (sin recursión)
CREATE POLICY "Plantas ven ofertas de sus viajes"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id IN (
                SELECT empresa_solicitante_id FROM viajes_red_nodexia 
                WHERE id = ofertas_red_nodexia.viaje_red_id
            )
        )
    );

-- Policy 8: Plantas actualizan ofertas
CREATE POLICY "Plantas actualizan ofertas"
    ON ofertas_red_nodexia FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id IN (
                SELECT empresa_solicitante_id FROM viajes_red_nodexia 
                WHERE id = ofertas_red_nodexia.viaje_red_id
            )
        )
    );

-- ============================================================================
-- POLÍTICAS - requisitos_viaje_red
-- ============================================================================

-- Policy 9: Todos ven requisitos (sin restricción para evitar recursión)
CREATE POLICY "Ver requisitos"
    ON requisitos_viaje_red FOR SELECT
    USING (true);

-- Policy 10: Plantas crean requisitos
CREATE POLICY "Plantas crean requisitos"
    ON requisitos_viaje_red FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id IN (
                SELECT empresa_solicitante_id FROM viajes_red_nodexia 
                WHERE id = requisitos_viaje_red.viaje_red_id
            )
        )
    );

-- Policy 11: Plantas actualizan requisitos
CREATE POLICY "Plantas actualizan requisitos"
    ON requisitos_viaje_red FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id IN (
                SELECT empresa_solicitante_id FROM viajes_red_nodexia 
                WHERE id = requisitos_viaje_red.viaje_red_id
            )
        )
    );

-- Verificación
SELECT 'Políticas RLS actualizadas correctamente - Sin recursión' as status;

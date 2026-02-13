-- ============================================================================
-- FIX RLS POLICIES - RED NODEXIA
-- Fecha: 2025-12-09
-- Descripción: Corregir políticas RLS para viajes_red_nodexia
-- Fix: Usar tabla correcta 'usuarios_empresa' (singular)
-- ============================================================================

-- Eliminar políticas existentes
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
-- POLÍTICAS CORREGIDAS - viajes_red_nodexia
-- ============================================================================

-- Policy 1: Plantas pueden ver sus propios viajes publicados
CREATE POLICY "Plantas ven sus viajes en red"
    ON viajes_red_nodexia FOR SELECT
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE usuario_id = auth.uid()
        )
    );

-- Policy 2: Transportes pueden ver viajes abiertos (sin vínculo directo)
CREATE POLICY "Transportes ven viajes abiertos sin vinculo"
    ON viajes_red_nodexia FOR SELECT
    USING (
        estado_red IN ('abierto', 'con_ofertas')
        AND EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            JOIN empresas e ON e.id = ue.empresa_id
            WHERE ue.usuario_id = auth.uid()
            AND e.tipo_empresa = 'transporte'
            -- Verificar que NO tenga vínculo directo con la planta
            AND NOT EXISTS (
                SELECT 1 FROM relaciones_empresas re
                WHERE re.empresa_transporte_id = e.id
                AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
                AND re.estado = 'activo'
            )
        )
    );

-- Policy 3: Transportes pueden ver viajes donde tienen ofertas (aunque ya no estén abiertos)
CREATE POLICY "Transportes ven viajes con sus ofertas"
    ON viajes_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ofertas_red_nodexia o
            WHERE o.viaje_red_id = viajes_red_nodexia.id
            AND o.transporte_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- Policy 4: Plantas pueden crear viajes en red
CREATE POLICY "Plantas crean viajes en red"
    ON viajes_red_nodexia FOR INSERT
    WITH CHECK (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE usuario_id = auth.uid()
        )
    );

-- Policy 5: Plantas pueden actualizar sus viajes
CREATE POLICY "Plantas actualizan sus viajes"
    ON viajes_red_nodexia FOR UPDATE
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE usuario_id = auth.uid()
        )
    );

-- ============================================================================
-- POLÍTICAS CORREGIDAS - ofertas_red_nodexia
-- ============================================================================

-- Policy 6: Transportes pueden crear ofertas
CREATE POLICY "Transportes crean ofertas"
    ON ofertas_red_nodexia FOR INSERT
    WITH CHECK (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE usuario_id = auth.uid()
        )
    );

-- Policy 7: Transportes ven sus propias ofertas
CREATE POLICY "Transportes ven sus ofertas"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE usuario_id = auth.uid()
        )
    );

-- Policy 8: Plantas ven ofertas de sus viajes
CREATE POLICY "Plantas ven ofertas de sus viajes"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresas 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- Policy 9: Plantas pueden actualizar ofertas (aceptar/rechazar)
CREATE POLICY "Plantas actualizan ofertas"
    ON ofertas_red_nodexia FOR UPDATE
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresas 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- POLÍTICAS - requisitos_viaje_red
-- ============================================================================

DROP POLICY IF EXISTS "Todos ven requisitos" ON requisitos_viaje_red;
DROP POLICY IF EXISTS "Plantas crean requisitos" ON requisitos_viaje_red;

-- Policy: Todos pueden ver requisitos de viajes que pueden ver
CREATE POLICY "Ver requisitos de viajes accesibles"
    ON requisitos_viaje_red FOR SELECT
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
        )
    );

-- Policy: Plantas pueden insertar requisitos de sus viajes
CREATE POLICY "Plantas crean requisitos"
    ON requisitos_viaje_red FOR INSERT
    WITH CHECK (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresas 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- Policy: Plantas pueden actualizar requisitos de sus viajes
CREATE POLICY "Plantas actualizan requisitos"
    ON requisitos_viaje_red FOR UPDATE
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresas 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('viajes_red_nodexia', 'ofertas_red_nodexia', 'requisitos_viaje_red')
ORDER BY tablename, policyname;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS de Red Nodexia corregidas exitosamente';
    RAISE NOTICE '   - user_id → usuario_id';
    RAISE NOTICE '   - usuarios_empresa → usuarios_empresas';
    RAISE NOTICE '   - Agregada política para transportes con ofertas';
    RAISE NOTICE '   - Agregadas políticas UPDATE';
END $$;

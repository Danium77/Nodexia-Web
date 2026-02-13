-- ============================================================================
-- FIX: Corregir RLS Policy para ocultar viajes asignados de Red Nodexia
-- Fecha: 18-Dic-2025
-- Problema: Viajes asignados siguen apareciendo en Red para todos los transportes
-- Solución: Solo permitir ver viajes asignados al transporte que fue seleccionado
-- ============================================================================

-- Eliminar policy problemática
DROP POLICY IF EXISTS "Transportes ven viajes con sus ofertas" ON viajes_red_nodexia;

-- ============================================================================
-- Policy 3 CORREGIDA: Transportes ven viajes con sus ofertas
-- Cambios:
-- - Solo mostrar viajes 'abierto' o 'con_ofertas' donde tengan ofertas
-- - Para viajes 'asignado', solo mostrarlos SI el transporte fue el seleccionado
-- ============================================================================
CREATE POLICY "Transportes ven viajes con sus ofertas"
    ON viajes_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ofertas_red_nodexia o
            WHERE o.viaje_red_id = viajes_red_nodexia.id
            AND o.transporte_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
        AND (
            -- Caso 1: Viaje disponible (abierto o con ofertas)
            viajes_red_nodexia.estado_red IN ('abierto', 'con_ofertas')
            OR
            -- Caso 2: Viaje asignado SOLO si soy el transporte seleccionado
            (
                viajes_red_nodexia.estado_red = 'asignado'
                AND viajes_red_nodexia.transporte_asignado_id IN (
                    SELECT empresa_id FROM usuarios_empresa 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- Verificación
-- ============================================================================
-- Esta policy ahora garantiza que:
-- 1. Transportes solo ven viajes donde tienen ofertas
-- 2. Si el viaje está 'abierto' o 'con_ofertas', lo ven todos los que ofertaron
-- 3. Si el viaje está 'asignado', solo lo ve el transporte seleccionado
-- 4. Todos los demás transportes YA NO verán el viaje asignado

COMMENT ON POLICY "Transportes ven viajes con sus ofertas" ON viajes_red_nodexia IS 
'Permite a transportes ver viajes donde tienen ofertas. Si el viaje está asignado, solo lo ve el transporte seleccionado. Actualizado 18-Dic-2025';

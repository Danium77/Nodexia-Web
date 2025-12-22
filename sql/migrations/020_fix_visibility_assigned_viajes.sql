-- ============================================================================
-- RESTAURAR: Política RLS correcta de Red Nodexia (perdida en Migration 018)
-- Fecha: 19-Dic-2025
-- Problema: Migration 018 simplificó policies y eliminó filtro por relaciones
-- Solución: Restaurar lógica del 11-Dic-2025 que funcionaba correctamente
-- Referencia: docs/archive/11-12-25-HITO-RED-NODEXIA-FILTRADO-RLS-COMPLETADO.md
-- ============================================================================

-- Eliminar policies actuales (todas las variantes posibles)
DROP POLICY IF EXISTS "Solo transportes sin vinculo ven viajes" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "transportes_select_viajes_abiertos" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "transportes_select_viajes_disponibles" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "Transportes ven viajes donde ofertaron" ON viajes_red_nodexia;
DROP POLICY IF EXISTS "transportes_select_viajes_con_ofertas" ON viajes_red_nodexia;

-- RESTAURAR: Policy original del 11-Dic que funcionaba
CREATE POLICY "Solo transportes sin vinculo ven viajes"
    ON viajes_red_nodexia FOR SELECT
    TO authenticated
    USING (
        -- Viajes disponibles: NO tengo relación activa con la planta
        (
            estado_red IN ('abierto', 'con_ofertas')
            AND NOT EXISTS (
                SELECT 1 
                FROM relaciones_empresas re
                WHERE re.empresa_transporte_id = public.uid_empresa()
                AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
                AND re.estado = 'activa'
            )
        )
        OR
        -- Viajes asignados: solo si me fueron asignados a MÍ
        (
            estado_red = 'asignado'
            AND transporte_asignado_id = public.uid_empresa()
        )
    );

COMMENT ON POLICY "Solo transportes sin vinculo ven viajes" ON viajes_red_nodexia IS 
'Red Nodexia: Transportes SIN relación activa ven viajes disponibles. Transportes CON relación NO los ven (asignación directa). Viajes asignados solo visibles para transporte seleccionado. Restaurado 19-Dic-2025 desde versión 11-Dic-2025';

-- Verificar que la función uid_empresa() existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'uid_empresa';

-- Verificar policies activas
SELECT 
    tablename,
    policyname,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename = 'viajes_red_nodexia'
ORDER BY policyname;

-- ============================================================================
-- IMPORTANTE: Esta migración restaura la lógica del 11-Dic-2025
-- ============================================================================
-- Funcionalidad esperada:
-- ✅ Logística Express (con relación activa) NO ve viajes de Aceitera
-- ✅ Logística del Centro (sin relación) SÍ ve viajes de Aceitera  
-- ✅ Viajes asignados solo visibles para el transporte seleccionado
-- ============================================================================

-- Migración 056: Fix RLS para que transportes vean viajes donde tienen ofertas
-- Problema: Transportes solo ven viajes con estado_red IN ('abierto', 'con_ofertas')
-- Cuando un viaje pasa a 'asignado', los transportes rechazados pierden visibilidad
-- y no ven la notificación de rechazo.
--
-- Solución: Agregar política que permite ver viajes donde el transporte tiene ofertas
-- (independiente del estado_red)

-- Eliminar política vieja con bug de columna (usuario_id vs user_id) si existe
DROP POLICY IF EXISTS "Transportes ven viajes con sus ofertas" ON viajes_red_nodexia;

-- Crear política corregida: transportes ven viajes donde tienen ofertas
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
    );

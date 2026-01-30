-- ============================================================================
-- SCRIPT FINAL: Sincronizar DEV con Comportamiento de PRODUCCIÓN
-- ============================================================================
-- Fecha: 28-Enero-2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: CAMBIAR FK A CASCADE (igual que producción)
-- ============================================================================

DO $$
BEGIN
    -- Eliminar la FK restrictiva actual
    ALTER TABLE viajes_despacho 
    DROP CONSTRAINT IF EXISTS fk_viajes_despacho_despacho_id;

    -- Crear nueva FK con CASCADE (al eliminar despacho, elimina viajes)
    ALTER TABLE viajes_despacho
    ADD CONSTRAINT fk_viajes_despacho_despacho_id 
    FOREIGN KEY (despacho_id) 
    REFERENCES despachos(id) 
    ON DELETE CASCADE 
    ON UPDATE NO ACTION;

    RAISE NOTICE '✅ FK cambiada a CASCADE - ahora puedes eliminar despachos con viajes';
END $$;

-- ============================================================================
-- PARTE 2: EJECUTAR EXPIRACIÓN PARA VIAJES ANTIGUOS
-- ============================================================================

-- Marcar TODOS los viajes que deberían estar expirados
DO $$
DECLARE
    v_result jsonb;
    v_viajes_antes integer;
    v_viajes_despues integer;
BEGIN
    -- Contar antes
    SELECT COUNT(*) INTO v_viajes_antes
    FROM viajes_despacho
    WHERE estado = 'expirado';
    
    -- Ejecutar marcado
    SELECT ejecutar_expiracion_viajes() INTO v_result;
    
    -- Contar después
    SELECT COUNT(*) INTO v_viajes_despues
    FROM viajes_despacho
    WHERE estado = 'expirado';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MARCADO DE VIAJES EXPIRADOS HISTÓRICOS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Antes: % viajes expirados', v_viajes_antes;
    RAISE NOTICE 'Después: % viajes expirados', v_viajes_despues;
    RAISE NOTICE 'Nuevos marcados: %', (v_viajes_despues - v_viajes_antes);
    RAISE NOTICE 'Resultado función: %', v_result;
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Ver todos los viajes expirados
SELECT 
    v.id,
    d.pedido_id,
    d.scheduled_date_time,
    v.estado,
    v.updated_at,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
    END AS razon
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
WHERE v.estado = 'expirado'
ORDER BY d.scheduled_date_time DESC;

-- Verificar FK
SELECT 
    constraint_name,
    delete_rule,
    update_rule
FROM information_schema.referential_constraints
WHERE constraint_name LIKE '%fk_viajes_despacho_despacho_id%';

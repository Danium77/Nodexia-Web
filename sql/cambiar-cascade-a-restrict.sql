-- =====================================================
-- CAMBIAR CONSTRAINTS DE CASCADE A RESTRICT
-- =====================================================
-- Las constraints hacia id_transporte siguen con CASCADE

-- 1. CHOFERES -> id_transporte
ALTER TABLE public.choferes
    DROP CONSTRAINT IF EXISTS choferes_id_transporte_fkey;

ALTER TABLE public.choferes
    ADD CONSTRAINT choferes_id_transporte_fkey 
    FOREIGN KEY (id_transporte) 
    REFERENCES public.empresas(id) 
    ON DELETE RESTRICT;

-- 2. CAMIONES -> id_transporte
ALTER TABLE public.camiones
    DROP CONSTRAINT IF EXISTS camiones_id_transporte_fkey;

ALTER TABLE public.camiones
    ADD CONSTRAINT camiones_id_transporte_fkey 
    FOREIGN KEY (id_transporte) 
    REFERENCES public.empresas(id) 
    ON DELETE RESTRICT;

-- 3. ACOPLADOS -> id_transporte
ALTER TABLE public.acoplados
    DROP CONSTRAINT IF EXISTS acoplados_id_transporte_fkey;

ALTER TABLE public.acoplados
    ADD CONSTRAINT acoplados_id_transporte_fkey 
    FOREIGN KEY (id_transporte) 
    REFERENCES public.empresas(id) 
    ON DELETE RESTRICT;

-- 4. RELACIONES_EMPRESAS -> empresa_cliente_id
ALTER TABLE public.relaciones_empresas
    DROP CONSTRAINT IF EXISTS relaciones_empresas_empresa_cliente_id_fkey;

ALTER TABLE public.relaciones_empresas
    ADD CONSTRAINT relaciones_empresas_empresa_cliente_id_fkey 
    FOREIGN KEY (empresa_cliente_id) 
    REFERENCES public.empresas(id) 
    ON DELETE RESTRICT;

-- 5. RELACIONES_EMPRESAS -> empresa_transporte_id
ALTER TABLE public.relaciones_empresas
    DROP CONSTRAINT IF EXISTS relaciones_empresas_empresa_transporte_id_fkey;

ALTER TABLE public.relaciones_empresas
    ADD CONSTRAINT relaciones_empresas_empresa_transporte_id_fkey 
    FOREIGN KEY (empresa_transporte_id) 
    REFERENCES public.empresas(id) 
    ON DELETE RESTRICT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT
    tc.table_name,
    tc.constraint_name,
    CASE 
        WHEN rc.delete_rule = 'NO ACTION' THEN '✅ RESTRICT/NO ACTION'
        WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ CASCADE'
        ELSE rc.delete_rule
    END as delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
        'choferes', 'camiones', 'acoplados', 'relaciones_empresas'
    )
ORDER BY tc.table_name;

-- Debe mostrar todas con RESTRICT/NO ACTION

SELECT '✅ CONSTRAINTS CAMBIADAS A RESTRICT' as resultado;

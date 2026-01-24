-- =====================================================
-- MEJORAS DE SEGURIDAD - NODEXIA PLATFORM
-- =====================================================
-- Fecha: 22 de Enero 2026
-- Auditor: NOD
-- Implementado por: Ingeniero de Software Senior
--
-- CAMBIOS:
-- 1. Soft Delete en despachos y viajes_despacho
-- 2. ON DELETE CASCADE → ON DELETE RESTRICT
-- 3. Políticas RLS para lectura cross-tenant sin service_role
-- 4. Filtro deleted_at IS NULL en todas las políticas
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: IMPLEMENTACIÓN DE SOFT DELETE
-- =====================================================

-- Agregar columna deleted_at a despachos
ALTER TABLE public.despachos 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Agregar columna deleted_at a viajes_despacho
ALTER TABLE public.viajes_despacho 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Crear índices para mejorar performance de queries con deleted_at
CREATE INDEX IF NOT EXISTS idx_despachos_deleted_at 
ON public.despachos(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_viajes_despacho_deleted_at 
ON public.viajes_despacho(deleted_at) 
WHERE deleted_at IS NULL;

-- Comentarios
COMMENT ON COLUMN public.despachos.deleted_at IS 'Fecha de eliminación lógica (soft delete). NULL = registro activo';
COMMENT ON COLUMN public.viajes_despacho.deleted_at IS 'Fecha de eliminación lógica (soft delete). NULL = registro activo';

-- =====================================================
-- PASO 2: CAMBIAR CASCADE A RESTRICT
-- =====================================================

-- Primero necesitamos encontrar el nombre de la constraint existente
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar el nombre de la FK constraint
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'viajes_despacho'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'despacho_id';
    
    IF constraint_name IS NOT NULL THEN
        -- Eliminar constraint existente
        EXECUTE format('ALTER TABLE public.viajes_despacho DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint anterior eliminada: %', constraint_name;
    END IF;
    
    -- Crear nueva constraint con RESTRICT
    ALTER TABLE public.viajes_despacho
    ADD CONSTRAINT fk_viajes_despacho_despacho_id
    FOREIGN KEY (despacho_id) 
    REFERENCES public.despachos(id) 
    ON DELETE RESTRICT;
    
    RAISE NOTICE '✅ Nueva constraint creada con ON DELETE RESTRICT';
END $$;

-- =====================================================
-- PASO 3: POLÍTICAS RLS - LECTURA CROSS-TENANT
-- =====================================================

-- =====================================================
-- 3.1 POLÍTICA PARA CHOFERES
-- =====================================================

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS "Ver choferes de mi empresa" ON public.choferes;
DROP POLICY IF EXISTS "Choferes: acceso por transporte" ON public.choferes;

-- Nueva política: Los usuarios pueden ver choferes de su empresa
-- O choferes asignados a viajes de despachos que ellos crearon
CREATE POLICY "choferes_acceso_multiempresa" ON public.choferes
    FOR SELECT
    USING (
        -- Caso 1: Usuario pertenece a la empresa del chofer
        id_transporte IN (
            SELECT empresa_id 
            FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
        OR
        -- Caso 2: Chofer está asignado a un viaje de un despacho creado por el usuario
        id IN (
            SELECT DISTINCT vd.chofer_id
            FROM public.viajes_despacho vd
            INNER JOIN public.despachos d ON vd.despacho_id = d.id
            WHERE d.created_by = auth.uid()
                AND vd.chofer_id IS NOT NULL
                AND vd.deleted_at IS NULL
                AND d.deleted_at IS NULL
        )
    );

COMMENT ON POLICY "choferes_acceso_multiempresa" ON public.choferes IS 
'Permite ver choferes de mi empresa O choferes asignados a mis despachos (cross-tenant seguro)';

-- =====================================================
-- 3.2 POLÍTICA PARA CAMIONES
-- =====================================================

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS "Ver camiones de mi empresa" ON public.camiones;
DROP POLICY IF EXISTS "Camiones: acceso por transporte" ON public.camiones;

-- Nueva política: Los usuarios pueden ver camiones de su empresa
-- O camiones asignados a viajes de despachos que ellos crearon
CREATE POLICY "camiones_acceso_multiempresa" ON public.camiones
    FOR SELECT
    USING (
        -- Caso 1: Usuario pertenece a la empresa del camión
        id_transporte IN (
            SELECT empresa_id 
            FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
        OR
        -- Caso 2: Camión está asignado a un viaje de un despacho creado por el usuario
        id IN (
            SELECT DISTINCT vd.camion_id
            FROM public.viajes_despacho vd
            INNER JOIN public.despachos d ON vd.despacho_id = d.id
            WHERE d.created_by = auth.uid()
                AND vd.camion_id IS NOT NULL
                AND vd.deleted_at IS NULL
                AND d.deleted_at IS NULL
        )
    );

COMMENT ON POLICY "camiones_acceso_multiempresa" ON public.camiones IS 
'Permite ver camiones de mi empresa O camiones asignados a mis despachos (cross-tenant seguro)';

-- =====================================================
-- 3.3 POLÍTICA PARA ACOPLADOS
-- =====================================================

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS "Ver acoplados de mi empresa" ON public.acoplados;
DROP POLICY IF EXISTS "Acoplados: acceso por transporte" ON public.acoplados;

-- Nueva política: Los usuarios pueden ver acoplados de su empresa
-- O acoplados asignados a viajes de despachos que ellos crearon
CREATE POLICY "acoplados_acceso_multiempresa" ON public.acoplados
    FOR SELECT
    USING (
        -- Caso 1: Usuario pertenece a la empresa del acoplado
        id_transporte IN (
            SELECT empresa_id 
            FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
        OR
        -- Caso 2: Acoplado está asignado a un viaje de un despacho creado por el usuario
        id IN (
            SELECT DISTINCT vd.acoplado_id
            FROM public.viajes_despacho vd
            INNER JOIN public.despachos d ON vd.despacho_id = d.id
            WHERE d.created_by = auth.uid()
                AND vd.acoplado_id IS NOT NULL
                AND vd.deleted_at IS NULL
                AND d.deleted_at IS NULL
        )
    );

COMMENT ON POLICY "acoplados_acceso_multiempresa" ON public.acoplados IS 
'Permite ver acoplados de mi empresa O acoplados asignados a mis despachos (cross-tenant seguro)';

-- =====================================================
-- PASO 4: REFACTORIZAR POLÍTICAS RLS EXISTENTES
-- =====================================================

-- =====================================================
-- 4.1 POLÍTICAS PARA DESPACHOS
-- =====================================================

DROP POLICY IF EXISTS "Ver despachos relevantes" ON public.despachos;
DROP POLICY IF EXISTS "usuarios_pueden_ver_despachos" ON public.despachos;

CREATE POLICY "despachos_lectura" ON public.despachos
    FOR SELECT
    USING (
        deleted_at IS NULL  -- Solo registros activos
        AND (
            -- Coordinadores ven sus propios despachos
            created_by = auth.uid()
            OR
            -- Transportistas ven despachos asignados a su empresa
            transport_id IN (
                SELECT empresa_id 
                FROM public.usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- 4.2 POLÍTICAS PARA VIAJES_DESPACHO
-- =====================================================

DROP POLICY IF EXISTS "Ver viajes de despacho" ON public.viajes_despacho;
DROP POLICY IF EXISTS "usuarios_pueden_ver_viajes" ON public.viajes_despacho;

CREATE POLICY "viajes_lectura" ON public.viajes_despacho
    FOR SELECT
    USING (
        deleted_at IS NULL  -- Solo registros activos
        AND (
            -- Usuario es coordinador del despacho padre
            despacho_id IN (
                SELECT id 
                FROM public.despachos 
                WHERE created_by = auth.uid()
                    AND deleted_at IS NULL
            )
            OR
            -- Usuario pertenece a la empresa transportista asignada
            transport_id IN (
                SELECT empresa_id 
                FROM public.usuarios_empresa 
                WHERE user_id = auth.uid()
            )
            OR
            -- Usuario es el chofer asignado al viaje
            chofer_id IN (
                SELECT id 
                FROM public.choferes 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- =====================================================
-- 4.3 POLÍTICAS PARA EMPRESAS
-- =====================================================

DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_empresas" ON public.empresas;
DROP POLICY IF EXISTS "Usuarios pueden ver sus empresas" ON public.empresas;

CREATE POLICY "empresas_lectura" ON public.empresas
    FOR SELECT
    USING (
        -- Empresas activas solamente (si existe columna activo)
        (NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'empresas' AND column_name = 'activo'
        ) OR activo = true)
        AND (
            -- Usuario pertenece a la empresa
            id IN (
                SELECT empresa_id 
                FROM public.usuarios_empresa 
                WHERE user_id = auth.uid()
            )
            OR
            -- Empresa es transportista de un despacho del usuario
            id IN (
                SELECT DISTINCT transport_id 
                FROM public.despachos 
                WHERE created_by = auth.uid()
                    AND transport_id IS NOT NULL
                    AND deleted_at IS NULL
            )
            OR
            -- Empresa es cliente que asignó despacho a mi empresa transportista
            id IN (
                SELECT DISTINCT ue.empresa_id
                FROM public.despachos d
                INNER JOIN public.usuarios_empresa ue ON ue.user_id = d.created_by
                WHERE d.transport_id IN (
                    SELECT empresa_id FROM public.usuarios_empresa WHERE user_id = auth.uid()
                )
                    AND d.deleted_at IS NULL
            )
        )
    );

-- =====================================================
-- 4.4 POLÍTICAS PARA USUARIOS_EMPRESA
-- =====================================================

DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_asociaciones" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Ver usuarios de mis empresas" ON public.usuarios_empresa;

CREATE POLICY "usuarios_empresa_lectura" ON public.usuarios_empresa
    FOR SELECT
    USING (
        activo = true  -- Solo asociaciones activas
        AND (
            -- Ver mis propias asociaciones
            user_id = auth.uid()
            OR
            -- Ver usuarios de empresas donde tengo acceso
            empresa_id IN (
                SELECT empresa_id 
                FROM public.usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- 4.5 POLÍTICAS PARA RELACIONES_EMPRESAS
-- =====================================================

DROP POLICY IF EXISTS "usuarios_pueden_ver_relaciones_empresa" ON public.relaciones_empresas;
DROP POLICY IF EXISTS "Ver relaciones de mis empresas" ON public.relaciones_empresas;

CREATE POLICY "relaciones_empresa_lectura" ON public.relaciones_empresas
    FOR SELECT
    USING (
        estado = 'activa'  -- Solo relaciones activas
        AND (
            empresa_cliente_id IN (
                SELECT empresa_id 
                FROM public.usuarios_empresa 
                WHERE user_id = auth.uid()
            )
            OR
            empresa_transporte_id IN (
                SELECT empresa_id 
                FROM public.usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- 4.6 POLÍTICAS PARA REGISTRO_CONTROL_ACCESO
-- =====================================================
-- NOTA: Tabla no existe en esta BD - Se omite esta política
-- Si necesitas crearla en el futuro, descomentar este bloque

/*
DROP POLICY IF EXISTS "Ver registros de control acceso" ON public.registro_control_acceso;

CREATE POLICY "registro_control_acceso_lectura" ON public.registro_control_acceso
    FOR SELECT
    USING (
        -- Usuario pertenece a empresa coordinadora del despacho asociado al viaje
        viaje_id IN (
            SELECT vd.id
            FROM public.viajes_despacho vd
            INNER JOIN public.despachos d ON vd.despacho_id = d.id
            WHERE d.created_by = auth.uid()
                AND vd.deleted_at IS NULL
                AND d.deleted_at IS NULL
        )
        OR
        -- Usuario pertenece a empresa transportista del viaje
        viaje_id IN (
            SELECT vd.id
            FROM public.viajes_despacho vd
            INNER JOIN public.usuarios_empresa ue ON vd.transport_id = ue.empresa_id
            WHERE ue.user_id = auth.uid()
                AND vd.deleted_at IS NULL
        )
        OR
        -- Usuario es el chofer asignado
        viaje_id IN (
            SELECT vd.id
            FROM public.viajes_despacho vd
            INNER JOIN public.choferes c ON vd.chofer_id = c.id
            WHERE c.usuario_id = auth.uid()
                AND vd.deleted_at IS NULL
        )
    );
*/

-- =====================================================
-- PASO 5: CREAR FUNCIONES AUXILIARES PARA SOFT DELETE
-- =====================================================

-- Función para soft delete de despachos
CREATE OR REPLACE FUNCTION public.soft_delete_despacho(despacho_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    viajes_count INTEGER;
BEGIN
    -- Verificar que el despacho pertenece al usuario actual
    IF NOT EXISTS (
        SELECT 1 FROM public.despachos 
        WHERE id = despacho_uuid 
            AND created_by = auth.uid()
            AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Despacho no encontrado o sin permisos';
    END IF;
    
    -- Contar viajes activos asociados
    SELECT COUNT(*) INTO viajes_count
    FROM public.viajes_despacho
    WHERE despacho_id = despacho_uuid
        AND deleted_at IS NULL;
    
    IF viajes_count > 0 THEN
        RAISE EXCEPTION 'No se puede eliminar despacho con % viajes activos', viajes_count;
    END IF;
    
    -- Realizar soft delete
    UPDATE public.despachos
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = despacho_uuid;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.soft_delete_despacho IS 
'Elimina lógicamente un despacho si no tiene viajes activos. Solo el creador puede eliminarlo.';

-- Función para soft delete de viajes
CREATE OR REPLACE FUNCTION public.soft_delete_viaje(viaje_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el usuario tiene permiso
    -- (es coordinador del despacho O pertenece a empresa transportista)
    IF NOT EXISTS (
        SELECT 1 FROM public.viajes_despacho vd
        INNER JOIN public.despachos d ON vd.despacho_id = d.id
        WHERE vd.id = viaje_uuid
            AND vd.deleted_at IS NULL
            AND (
                d.created_by = auth.uid()
                OR
                vd.transport_id IN (
                    SELECT empresa_id 
                    FROM public.usuarios_empresa 
                    WHERE user_id = auth.uid()
                )
            )
    ) THEN
        RAISE EXCEPTION 'Viaje no encontrado o sin permisos';
    END IF;
    
    -- Realizar soft delete
    UPDATE public.viajes_despacho
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = viaje_uuid;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.soft_delete_viaje IS 
'Elimina lógicamente un viaje. El coordinador o la empresa transportista pueden eliminarlo.';

-- Función para restaurar despacho
CREATE OR REPLACE FUNCTION public.restore_despacho(despacho_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el despacho pertenece al usuario actual
    IF NOT EXISTS (
        SELECT 1 FROM public.despachos 
        WHERE id = despacho_uuid 
            AND created_by = auth.uid()
            AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Despacho no encontrado o sin permisos';
    END IF;
    
    -- Restaurar despacho
    UPDATE public.despachos
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = despacho_uuid;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.restore_despacho IS 
'Restaura un despacho eliminado lógicamente. Solo el creador puede restaurarlo.';

-- =====================================================
-- PASO 6: CREAR VISTA PARA AUDITORIA
-- =====================================================

CREATE OR REPLACE VIEW public.v_registros_eliminados AS
SELECT 
    'despacho' AS tipo_registro,
    id,
    pedido_id AS identificador,
    deleted_at AS fecha_eliminacion,
    created_by AS eliminado_por,
    NULL::UUID AS despacho_padre_id
FROM public.despachos
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT 
    'viaje' AS tipo_registro,
    id,
    CAST(numero_viaje AS TEXT) AS identificador,
    deleted_at AS fecha_eliminacion,
    NULL::UUID AS eliminado_por,
    despacho_id AS despacho_padre_id
FROM public.viajes_despacho
WHERE deleted_at IS NOT NULL

ORDER BY fecha_eliminacion DESC;

COMMENT ON VIEW public.v_registros_eliminados IS 
'Vista de auditoría que muestra todos los registros eliminados (soft delete)';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    despachos_policy_count INTEGER;
    viajes_policy_count INTEGER;
    choferes_policy_count INTEGER;
    camiones_policy_count INTEGER;
BEGIN
    -- Contar políticas creadas
    SELECT COUNT(*) INTO despachos_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
        AND tablename = 'despachos';
    
    SELECT COUNT(*) INTO viajes_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
        AND tablename = 'viajes_despacho';
    
    SELECT COUNT(*) INTO choferes_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
        AND tablename = 'choferes';
    
    SELECT COUNT(*) INTO camiones_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
        AND tablename = 'camiones';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Columnas agregadas:';
    RAISE NOTICE '  - despachos.deleted_at';
    RAISE NOTICE '  - viajes_despacho.deleted_at';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Constraint actualizada:';
    RAISE NOTICE '  - viajes_despacho.despacho_id: ON DELETE RESTRICT';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ Políticas RLS creadas:';
    RAISE NOTICE '  - despachos: % políticas', despachos_policy_count;
    RAISE NOTICE '  - viajes_despacho: % políticas', viajes_policy_count;
    RAISE NOTICE '  - choferes: % políticas (incluye cross-tenant)', choferes_policy_count;
    RAISE NOTICE '  - camiones: % políticas (incluye cross-tenant)', camiones_policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ Funciones creadas:';
    RAISE NOTICE '  - soft_delete_despacho()';
    RAISE NOTICE '  - soft_delete_viaje()';
    RAISE NOTICE '  - restore_despacho()';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Vista de auditoría creada:';
    RAISE NOTICE '  - v_registros_eliminados';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️ ACCIÓN REQUERIDA EN CÓDIGO:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. Eliminar endpoints que usan supabaseAdmin (service_role)';
    RAISE NOTICE '   - /api/transporte/despachos-info.ts';
    RAISE NOTICE '';
    RAISE NOTICE '2. Actualizar queries para usar RLS nativo:';
    RAISE NOTICE '   - Cambiar: supabaseAdmin.from(...)';
    RAISE NOTICE '   - Por: supabase.from(...)';
    RAISE NOTICE '';
    RAISE NOTICE '3. Agregar filtro deleted_at en frontend:';
    RAISE NOTICE '   - .is(''deleted_at'', null) en queries importantes';
    RAISE NOTICE '';
    RAISE NOTICE '4. Implementar UI para soft delete:';
    RAISE NOTICE '   - Botón "Eliminar" llama a soft_delete_despacho()';
    RAISE NOTICE '   - Botón "Restaurar" llama a restore_despacho()';
    RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- TESTING (ejecutar manualmente después de COMMIT)
-- =====================================================

-- Test 1: Verificar que soft delete funciona
-- SELECT soft_delete_despacho('<uuid_de_prueba>');

-- Test 2: Verificar vista de auditoría
-- SELECT * FROM v_registros_eliminados LIMIT 10;

-- Test 3: Verificar políticas RLS
-- SELECT tablename, policyname, permissive, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--     AND tablename IN ('despachos', 'viajes_despacho', 'choferes', 'camiones')
-- ORDER BY tablename, policyname;

-- Test 4: Verificar que coordinador puede ver chofer de transportista
-- (ejecutar como usuario coordinador después de asignar un viaje)
-- SELECT * FROM choferes WHERE id = '<chofer_uuid_de_transportista>';

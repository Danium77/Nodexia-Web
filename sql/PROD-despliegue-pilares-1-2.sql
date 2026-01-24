-- =====================================================
-- DESPLIEGUE PRODUCCIÓN - PILARES 1 Y 2
-- =====================================================
-- Fecha: 24 de Enero 2026
-- Ambiente: PRODUCCIÓN (Supabase)
-- Release: v2.0.0 - Red Dinámica con Identidades Encastrables
-- Validado por: NOD (Auditor)
-- 
-- IMPORTANTE: Ejecutar en Supabase PROD SQL Editor
-- Tiempo estimado: 3-5 minutos
-- =====================================================

BEGIN;

-- =====================================================
-- PILAR 1: SOFT DELETE + RLS + SEGURIDAD
-- =====================================================

-- 1.1. Agregar columnas deleted_at a 9 tablas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.choferes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.camiones ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.acoplados ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.despachos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.viajes_despacho ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.relaciones_empresas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 1.2. Crear índices parciales para soft delete (solo registros activos)
CREATE INDEX IF NOT EXISTS idx_empresas_deleted_at ON public.empresas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON public.usuarios(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_choferes_deleted_at ON public.choferes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_camiones_deleted_at ON public.camiones(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_acoplados_deleted_at ON public.acoplados(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_despachos_deleted_at ON public.despachos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_deleted_at ON public.viajes_despacho(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_deleted_at ON public.pedidos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_relaciones_empresas_deleted_at ON public.relaciones_empresas(deleted_at) WHERE deleted_at IS NULL;

-- 1.3. Habilitar RLS en 9 tablas (si no está habilitado)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choferes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoplados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viajes_despacho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- 1.4. Función helper para soft delete de despachos
CREATE OR REPLACE FUNCTION public.soft_delete_despacho(despacho_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    viajes_count INT;
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

-- 1.5. Función helper para soft delete de viajes
CREATE OR REPLACE FUNCTION public.soft_delete_viaje(viaje_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el usuario tiene permiso
    IF NOT EXISTS (
        SELECT 1 FROM public.viajes_despacho vd
        INNER JOIN public.despachos d ON vd.despacho_id = d.id
        WHERE vd.id = viaje_uuid
            AND vd.deleted_at IS NULL
            AND (d.created_by = auth.uid() OR vd.transport_id IN (
                SELECT empresa_id FROM public.usuarios_empresa 
                WHERE user_id = auth.uid() AND activo = true
            ))
    ) THEN
        RAISE EXCEPTION 'Viaje no encontrado o sin permisos';
    END IF;
    
    -- Realizar soft delete
    UPDATE public.viajes_despacho
    SET deleted_at = NOW()
    WHERE id = viaje_uuid;
    
    RETURN TRUE;
END;
$$;

-- 1.6. Función helper para restaurar despacho
CREATE OR REPLACE FUNCTION public.restore_despacho(despacho_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar permisos
    IF NOT EXISTS (
        SELECT 1 FROM public.despachos 
        WHERE id = despacho_uuid 
            AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Despacho no encontrado o sin permisos';
    END IF;
    
    -- Restaurar
    UPDATE public.despachos
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = despacho_uuid;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- PILAR 2: IDENTIDADES ENCASTRABLES
-- =====================================================

-- 2.1. Eliminar constraints UNIQUE de columna simple
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Camiones: patente
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.camiones'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.camiones'::regclass
          AND attname = 'patente'
      );
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.camiones DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Acoplados: patente
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.acoplados'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.acoplados'::regclass
          AND attname = 'patente'
      );
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.acoplados DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Choferes: dni
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.choferes'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.choferes'::regclass
          AND attname = 'dni'
      );
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.choferes DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- 2.2. Crear índices UNIQUE compuestos (patente/dni + empresa)
DROP INDEX IF EXISTS public.idx_camiones_patente_transporte_unique;
CREATE UNIQUE INDEX idx_camiones_patente_transporte_unique
ON public.camiones(patente, id_transporte)
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS public.idx_acoplados_patente_transporte_unique;
CREATE UNIQUE INDEX idx_acoplados_patente_transporte_unique
ON public.acoplados(patente, id_transporte)
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS public.idx_choferes_dni_transporte_unique;
CREATE UNIQUE INDEX idx_choferes_dni_transporte_unique
ON public.choferes(dni, id_transporte)
WHERE deleted_at IS NULL;

-- 2.3. Crear tabla recurso_asignaciones (cerebro de movilidad)
CREATE TABLE IF NOT EXISTS public.recurso_asignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurso_id UUID NOT NULL,
    tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('camion', 'chofer', 'acoplado')),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ DEFAULT NULL,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4. Índices de performance para recurso_asignaciones
CREATE INDEX IF NOT EXISTS idx_recurso_asignaciones_recurso 
ON public.recurso_asignaciones(recurso_id, tipo_recurso);

CREATE INDEX IF NOT EXISTS idx_recurso_asignaciones_empresa 
ON public.recurso_asignaciones(empresa_id);

CREATE INDEX IF NOT EXISTS idx_recurso_asignaciones_activas 
ON public.recurso_asignaciones(empresa_id, tipo_recurso) 
WHERE fecha_fin IS NULL;

-- 2.5. Habilitar RLS en recurso_asignaciones
ALTER TABLE public.recurso_asignaciones ENABLE ROW LEVEL SECURITY;

-- 2.6. Políticas RLS para recurso_asignaciones
DROP POLICY IF EXISTS "Empresas ven sus asignaciones" ON public.recurso_asignaciones;
CREATE POLICY "Empresas ven sus asignaciones"
ON public.recurso_asignaciones
FOR SELECT
USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

DROP POLICY IF EXISTS "Empresas crean asignaciones para sí mismas" ON public.recurso_asignaciones;
CREATE POLICY "Empresas crean asignaciones para sí mismas"
ON public.recurso_asignaciones
FOR INSERT
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

DROP POLICY IF EXISTS "Empresas actualizan sus asignaciones" ON public.recurso_asignaciones;
CREATE POLICY "Empresas actualizan sus asignaciones"
ON public.recurso_asignaciones
FOR UPDATE
USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- 2.7. Función helper para asignar recursos
CREATE OR REPLACE FUNCTION public.asignar_recurso_a_empresa(
    p_recurso_id UUID,
    p_tipo_recurso TEXT,
    p_empresa_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_asignacion_id UUID;
BEGIN
    -- Validar tipo_recurso
    IF p_tipo_recurso NOT IN ('camion', 'chofer', 'acoplado') THEN
        RAISE EXCEPTION 'Tipo de recurso inválido: %', p_tipo_recurso;
    END IF;

    -- Cerrar asignación anterior del mismo recurso (si existe)
    UPDATE public.recurso_asignaciones
    SET fecha_fin = NOW()
    WHERE recurso_id = p_recurso_id
      AND tipo_recurso = p_tipo_recurso
      AND fecha_fin IS NULL;

    -- Crear nueva asignación
    INSERT INTO public.recurso_asignaciones (
        recurso_id,
        tipo_recurso,
        empresa_id,
        fecha_inicio
    ) VALUES (
        p_recurso_id,
        p_tipo_recurso,
        p_empresa_id,
        NOW()
    )
    RETURNING id INTO v_asignacion_id;

    RETURN v_asignacion_id;
END;
$$;

-- 2.8. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recurso_asignaciones_updated_at ON public.recurso_asignaciones;
CREATE TRIGGER update_recurso_asignaciones_updated_at
BEFORE UPDATE ON public.recurso_asignaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar soft delete
DO $$
DECLARE
    tables_with_deleted_at INT;
BEGIN
    SELECT COUNT(DISTINCT table_name) INTO tables_with_deleted_at
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'deleted_at'
      AND table_name IN (
          'empresas', 'usuarios', 'choferes', 'camiones', 'acoplados',
          'despachos', 'viajes_despacho', 'pedidos', 'relaciones_empresas'
      );
    
    IF tables_with_deleted_at = 9 THEN
        RAISE NOTICE '✅ Soft delete: 9/9 tablas con columna deleted_at';
    ELSE
        RAISE WARNING '⚠️ Soft delete: Solo %/9 tablas tienen deleted_at', tables_with_deleted_at;
    END IF;
END $$;

-- Verificar RLS habilitado
DO $$
DECLARE
    tables_with_rls INT;
BEGIN
    SELECT COUNT(*) INTO tables_with_rls
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
      AND tablename IN (
          'empresas', 'usuarios', 'choferes', 'camiones', 'acoplados',
          'despachos', 'viajes_despacho', 'pedidos', 'relaciones_empresas',
          'recurso_asignaciones'
      );
    
    IF tables_with_rls = 10 THEN
        RAISE NOTICE '✅ RLS: 10/10 tablas con Row Level Security habilitado';
    ELSE
        RAISE WARNING '⚠️ RLS: Solo %/10 tablas tienen RLS habilitado', tables_with_rls;
    END IF;
END $$;

-- Verificar índices UNIQUE compuestos
DO $$
DECLARE
    unique_indexes INT;
BEGIN
    SELECT COUNT(*) INTO unique_indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
          'idx_camiones_patente_transporte_unique',
          'idx_acoplados_patente_transporte_unique',
          'idx_choferes_dni_transporte_unique'
      );
    
    IF unique_indexes = 3 THEN
        RAISE NOTICE '✅ Identidades encastrables: 3/3 índices UNIQUE compuestos creados';
    ELSE
        RAISE WARNING '⚠️ Identidades encastrables: Solo %/3 índices creados', unique_indexes;
    END IF;
END $$;

-- Verificar tabla recurso_asignaciones
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recurso_asignaciones'
    ) THEN
        RAISE NOTICE '✅ Tabla recurso_asignaciones creada exitosamente';
    ELSE
        RAISE WARNING '⚠️ Tabla recurso_asignaciones NO existe';
    END IF;
END $$;

-- Verificar funciones
DO $$
DECLARE
    functions_count INT;
BEGIN
    SELECT COUNT(*) INTO functions_count
    FROM pg_proc
    WHERE proname IN (
        'soft_delete_despacho',
        'soft_delete_viaje',
        'restore_despacho',
        'asignar_recurso_a_empresa',
        'update_updated_at_column'
    );
    
    IF functions_count = 5 THEN
        RAISE NOTICE '✅ Funciones: 5/5 funciones helper creadas';
    ELSE
        RAISE WARNING '⚠️ Funciones: Solo %/5 funciones creadas', functions_count;
    END IF;
END $$;

COMMIT;

-- =====================================================
-- RESUMEN DE CAMBIOS
-- =====================================================
-- ✅ PILAR 1:
--    - 9 tablas con soft delete (deleted_at)
--    - 9 índices parciales para performance
--    - RLS habilitado en 9 tablas
--    - 3 funciones helper (soft delete/restore)
--
-- ✅ PILAR 2:
--    - 3 constraints UNIQUE eliminadas
--    - 3 índices UNIQUE compuestos creados
--    - 1 tabla recurso_asignaciones (tracking movilidad)
--    - 3 políticas RLS en nueva tabla
--    - 1 función helper asignación de recursos
--    - 1 trigger para updated_at automático
--
-- TOTAL: 10 tablas con RLS, 12 índices nuevos, 5 funciones, 3 políticas RLS
-- =====================================================

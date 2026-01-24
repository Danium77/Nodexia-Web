-- =====================================================
-- PILAR 2: IDENTIDADES ENCASTRABLES - NODEXIA PLATFORM
-- =====================================================
-- Fecha: 24 de Enero 2026
-- Auditor: NOD
-- Implementado por: Arquitecto de Datos Senior
--
-- CAMBIOS:
-- 1. Liberación de unicidad: patente y dni pueden repetirse
-- 2. Índices UNIQUE compuestos por empresa
-- 3. Tabla recurso_asignaciones para trackear movilidad
-- 4. RLS en nueva tabla
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: LIBERACIÓN DE UNICIDAD
-- =====================================================

-- 1.1. CAMIONES: Eliminar UNIQUE de patente
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar nombre de la constraint UNIQUE en patente
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
        RAISE NOTICE 'Eliminada constraint UNIQUE de camiones.patente: %', constraint_name;
    ELSE
        RAISE NOTICE 'No se encontró constraint UNIQUE en camiones.patente';
    END IF;
END $$;

-- 1.2. ACOPLADOS: Eliminar UNIQUE de patente
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar nombre de la constraint UNIQUE en patente
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
        RAISE NOTICE 'Eliminada constraint UNIQUE de acoplados.patente: %', constraint_name;
    ELSE
        RAISE NOTICE 'No se encontró constraint UNIQUE en acoplados.patente';
    END IF;
END $$;

-- 1.3. CHOFERES: Eliminar UNIQUE de dni
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar nombre de la constraint UNIQUE en dni
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
        RAISE NOTICE 'Eliminada constraint UNIQUE de choferes.dni: %', constraint_name;
    ELSE
        RAISE NOTICE 'No se encontró constraint UNIQUE en choferes.dni';
    END IF;
END $$;

-- =====================================================
-- PASO 2: ÍNDICES UNIQUE COMPUESTOS
-- =====================================================

-- 2.1. CAMIONES: UNIQUE (patente, id_transporte)
DROP INDEX IF EXISTS public.idx_camiones_patente_transporte_unique;
CREATE UNIQUE INDEX idx_camiones_patente_transporte_unique
ON public.camiones(patente, id_transporte)
WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_camiones_patente_transporte_unique IS 
'Permite que la misma patente exista en múltiples empresas (identidades encastrables). Solo registros activos.';

-- 2.2. ACOPLADOS: UNIQUE (patente, id_transporte)
DROP INDEX IF EXISTS public.idx_acoplados_patente_transporte_unique;
CREATE UNIQUE INDEX idx_acoplados_patente_transporte_unique
ON public.acoplados(patente, id_transporte)
WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_acoplados_patente_transporte_unique IS 
'Permite que la misma patente exista en múltiples empresas (identidades encastrables). Solo registros activos.';

-- 2.3. CHOFERES: UNIQUE (dni, id_transporte)
DROP INDEX IF EXISTS public.idx_choferes_dni_transporte_unique;
CREATE UNIQUE INDEX idx_choferes_dni_transporte_unique
ON public.choferes(dni, id_transporte)
WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_choferes_dni_transporte_unique IS 
'Permite que el mismo DNI exista en múltiples empresas (identidades encastrables). Solo registros activos.';

-- =====================================================
-- PASO 3: TABLA RECURSO_ASIGNACIONES (CEREBRO DE MOVILIDAD)
-- =====================================================

-- 3.1. Crear tabla si no existe
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

-- 3.2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_recurso_asignaciones_recurso 
ON public.recurso_asignaciones(recurso_id, tipo_recurso);

CREATE INDEX IF NOT EXISTS idx_recurso_asignaciones_empresa 
ON public.recurso_asignaciones(empresa_id);

CREATE INDEX IF NOT EXISTS idx_recurso_asignaciones_activas 
ON public.recurso_asignaciones(empresa_id, tipo_recurso) 
WHERE fecha_fin IS NULL;

-- 3.3. Comentarios
COMMENT ON TABLE public.recurso_asignaciones IS 
'Historial de asignación de recursos (choferes, camiones, acoplados) a empresas. Permite trackear movilidad entre flotas.';

COMMENT ON COLUMN public.recurso_asignaciones.recurso_id IS 
'ID del recurso (camion.id, chofer.id, o acoplado.id)';

COMMENT ON COLUMN public.recurso_asignaciones.tipo_recurso IS 
'Tipo de recurso: camion, chofer, o acoplado';

COMMENT ON COLUMN public.recurso_asignaciones.empresa_id IS 
'Empresa a la que está asignado el recurso';

COMMENT ON COLUMN public.recurso_asignaciones.fecha_inicio IS 
'Fecha de inicio de la asignación';

COMMENT ON COLUMN public.recurso_asignaciones.fecha_fin IS 
'Fecha de fin de la asignación. NULL = asignación activa';

-- =====================================================
-- PASO 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- 4.1. Habilitar RLS
ALTER TABLE public.recurso_asignaciones ENABLE ROW LEVEL SECURITY;

-- 4.2. Política: Empresas ven su propio historial
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

-- 4.3. Política: Solo la empresa propietaria puede insertar
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

-- 4.4. Política: Solo la empresa propietaria puede actualizar
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

-- =====================================================
-- PASO 5: TRIGGER PARA UPDATED_AT
-- =====================================================

-- 5.1. Función trigger (reutilizable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2. Aplicar trigger a recurso_asignaciones
DROP TRIGGER IF EXISTS update_recurso_asignaciones_updated_at ON public.recurso_asignaciones;
CREATE TRIGGER update_recurso_asignaciones_updated_at
BEFORE UPDATE ON public.recurso_asignaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PASO 6: FUNCIÓN HELPER PARA VINCULAR RECURSOS
-- =====================================================

-- 6.1. Función para iniciar asignación de recurso
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

COMMENT ON FUNCTION public.asignar_recurso_a_empresa IS 
'Cierra asignación previa (si existe) y crea nueva asignación de recurso a empresa. Retorna ID de la nueva asignación.';

-- =====================================================
-- PASO 7: VERIFICACIÓN FINAL
-- =====================================================

-- 7.1. Verificar que constraints UNIQUE fueron eliminadas
DO $$
DECLARE
    unique_constraints INT;
BEGIN
    SELECT COUNT(*) INTO unique_constraints
    FROM pg_constraint
    WHERE conrelid IN ('public.camiones'::regclass, 'public.acoplados'::regclass, 'public.choferes'::regclass)
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] IN (
          SELECT attnum FROM pg_attribute
          WHERE attrelid IN ('public.camiones'::regclass, 'public.acoplados'::regclass, 'public.choferes'::regclass)
          AND attname IN ('patente', 'dni')
      );
    
    IF unique_constraints > 0 THEN
        RAISE WARNING 'Aún existen % constraints UNIQUE en patente/dni', unique_constraints;
    ELSE
        RAISE NOTICE '✅ Todas las constraints UNIQUE de patente/dni fueron eliminadas';
    END IF;
END $$;

-- 7.2. Verificar índices UNIQUE compuestos
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
      'idx_camiones_patente_transporte_unique',
      'idx_acoplados_patente_transporte_unique',
      'idx_choferes_dni_transporte_unique'
  )
ORDER BY tablename, indexname;

-- 7.3. Verificar tabla recurso_asignaciones
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recurso_asignaciones'
ORDER BY ordinal_position;

-- 7.4. Verificar RLS en recurso_asignaciones
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'recurso_asignaciones'
ORDER BY policyname;

COMMIT;

-- =====================================================
-- FIN DE MIGRACIONES PILAR 2
-- =====================================================

-- 📊 Resumen de cambios:
-- ✅ Eliminadas 3 constraints UNIQUE (patente x2, dni x1)
-- ✅ Creados 3 índices UNIQUE compuestos con empresa
-- ✅ Tabla recurso_asignaciones con 8 campos
-- ✅ RLS con 3 políticas de acceso
-- ✅ Función helper asignar_recurso_a_empresa()
-- ✅ Trigger para updated_at automático

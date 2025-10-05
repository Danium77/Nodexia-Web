-- PASO 4: Actualizar tabla empresas y crear funciones
-- Ejecutar después del PASO 3

-- Actualizar tabla empresas para incluir plan y tipo de ecosistema
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS plan_suscripcion_id UUID REFERENCES public.planes_suscripcion(id),
ADD COLUMN IF NOT EXISTS tipo_ecosistema_id UUID REFERENCES public.tipos_empresa_ecosistema(id),
ADD COLUMN IF NOT EXISTS fecha_suscripcion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
ADD COLUMN IF NOT EXISTS estado_suscripcion VARCHAR(20) DEFAULT 'activa',
ADD COLUMN IF NOT EXISTS configuracion_empresa JSONB DEFAULT '{}';

-- Actualizar tabla usuarios_empresa para incluir rol específico
ALTER TABLE public.usuarios_empresa 
ADD COLUMN IF NOT EXISTS rol_empresa_id UUID REFERENCES public.roles_empresa(id),
ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
ADD COLUMN IF NOT EXISTS configuracion_usuario JSONB DEFAULT '{}';

-- Función para crear empresa completa con plan y tipo
CREATE OR REPLACE FUNCTION crear_empresa_completa(
    p_nombre TEXT,
    p_cuit TEXT,
    p_email TEXT,
    p_telefono TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_plan_nombre TEXT DEFAULT 'Básico',
    p_tipo_ecosistema TEXT DEFAULT 'Cliente'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa_id UUID;
    v_plan_id UUID;
    v_tipo_id UUID;
BEGIN
    -- Obtener ID del plan
    SELECT id INTO v_plan_id 
    FROM public.planes_suscripcion 
    WHERE nombre = p_plan_nombre AND activo = true;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan de suscripción % no encontrado', p_plan_nombre;
    END IF;
    
    -- Obtener ID del tipo de ecosistema
    SELECT id INTO v_tipo_id 
    FROM public.tipos_empresa_ecosistema 
    WHERE nombre = p_tipo_ecosistema AND activo = true;
    
    IF v_tipo_id IS NULL THEN
        RAISE EXCEPTION 'Tipo de empresa % no encontrado', p_tipo_ecosistema;
    END IF;
    
    -- Crear la empresa
    INSERT INTO public.empresas (
        nombre, cuit, email, telefono, direccion,
        plan_suscripcion_id, tipo_ecosistema_id,
        tipo_empresa, activa, estado_suscripcion
    ) VALUES (
        p_nombre, p_cuit, p_email, p_telefono, p_direccion,
        v_plan_id, v_tipo_id,
        p_tipo_ecosistema, true, 'activa'
    ) RETURNING id INTO v_empresa_id;
    
    RETURN v_empresa_id;
END;
$$;

-- Función para asignar usuario a empresa con rol
CREATE OR REPLACE FUNCTION asignar_usuario_empresa(
    p_user_id UUID,
    p_empresa_id UUID,
    p_rol_nombre TEXT,
    p_nombre_completo TEXT,
    p_email_interno TEXT,
    p_departamento TEXT DEFAULT 'General'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rol_id UUID;
    v_tipo_ecosistema_id UUID;
    v_usuario_empresa_id UUID;
BEGIN
    -- Obtener tipo de ecosistema de la empresa
    SELECT tipo_ecosistema_id INTO v_tipo_ecosistema_id
    FROM public.empresas
    WHERE id = p_empresa_id;
    
    IF v_tipo_ecosistema_id IS NULL THEN
        RAISE EXCEPTION 'Empresa no encontrada o sin tipo de ecosistema definido';
    END IF;
    
    -- Obtener ID del rol para el tipo de ecosistema
    SELECT id INTO v_rol_id 
    FROM public.roles_empresa 
    WHERE nombre = p_rol_nombre 
    AND tipo_ecosistema_id = v_tipo_ecosistema_id 
    AND activo = true;
    
    IF v_rol_id IS NULL THEN
        RAISE EXCEPTION 'Rol % no encontrado para el tipo de empresa', p_rol_nombre;
    END IF;
    
    -- Crear o actualizar la asignación
    INSERT INTO public.usuarios_empresa (
        user_id, empresa_id, rol_empresa_id,
        nombre_completo, email_interno, departamento,
        rol_interno, activo
    ) VALUES (
        p_user_id, p_empresa_id, v_rol_id,
        p_nombre_completo, p_email_interno, p_departamento,
        p_rol_nombre, true
    ) 
    ON CONFLICT (user_id, empresa_id) 
    DO UPDATE SET
        rol_empresa_id = v_rol_id,
        rol_interno = p_rol_nombre,
        nombre_completo = p_nombre_completo,
        email_interno = p_email_interno,
        departamento = p_departamento,
        fecha_asignacion = TIMEZONE('utc'::text, NOW()),
        activo = true
    RETURNING id INTO v_usuario_empresa_id;
    
    RETURN v_usuario_empresa_id;
END;
$$;
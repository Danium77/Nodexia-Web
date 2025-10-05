-- Actualizar función crear_empresa_completa para manejar el mapeo de tipos
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
    v_tipo_para_constraint TEXT;
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
    
    -- Mapear tipo de ecosistema a tipo compatible con constraint
    CASE p_tipo_ecosistema
        WHEN 'Planta' THEN v_tipo_para_constraint := 'coordinador';
        WHEN 'Cliente' THEN v_tipo_para_constraint := 'coordinador';
        WHEN 'Transporte' THEN v_tipo_para_constraint := 'transporte';
        ELSE v_tipo_para_constraint := 'coordinador';
    END CASE;
    
    -- Crear la empresa
    INSERT INTO public.empresas (
        nombre, cuit, email, telefono, direccion,
        plan_suscripcion_id, tipo_ecosistema_id,
        tipo_empresa, activa, estado_suscripcion
    ) VALUES (
        p_nombre, p_cuit, p_email, p_telefono, p_direccion,
        v_plan_id, v_tipo_id,
        v_tipo_para_constraint, true, 'activa'
    ) RETURNING id INTO v_empresa_id;
    
    RETURN v_empresa_id;
END;
$$;
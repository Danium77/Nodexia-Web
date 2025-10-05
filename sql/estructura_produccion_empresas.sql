-- Estructura de producción para gestión completa de empresas
-- Incluye planes de suscripción y roles del ecosistema Nodexia

-- 1. Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS public.planes_suscripcion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_mensual DECIMAL(10,2),
    caracteristicas JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Insertar planes de suscripción por defecto
INSERT INTO public.planes_suscripcion (nombre, descripcion, precio_mensual, caracteristicas) VALUES
('Básico', 'Plan básico para empresas pequeñas', 99.99, '{"usuarios_max": 5, "despachos_mes": 100, "reportes": false, "soporte": "email"}'),
('Profesional', 'Plan profesional para empresas medianas', 199.99, '{"usuarios_max": 20, "despachos_mes": 500, "reportes": true, "soporte": "telefono", "api_access": true}'),
('Empresarial', 'Plan empresarial para grandes empresas', 399.99, '{"usuarios_max": -1, "despachos_mes": -1, "reportes": true, "soporte": "dedicado", "api_access": true, "integraciones": true}')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Tipos de empresa en el ecosistema Nodexia
CREATE TABLE IF NOT EXISTS public.tipos_empresa_ecosistema (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos_base JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Insertar tipos de empresa del ecosistema
INSERT INTO public.tipos_empresa_ecosistema (nombre, descripcion, permisos_base) VALUES
('Planta', 'Empresa de producción/fabricación que genera cargas', '{"crear_despachos": true, "ver_transportes": true, "gestionar_cargas": true, "reportes_produccion": true}'),
('Transporte', 'Empresa de transporte que ejecuta los despachos', '{"aceptar_despachos": true, "gestionar_flota": true, "ver_rutas": true, "reportes_transporte": true}'),
('Cliente', 'Empresa cliente que recibe productos/servicios', '{"ver_despachos": true, "tracking": true, "reportes_recepcion": true, "feedback": true}')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Actualizar tabla empresas para incluir plan y tipo de ecosistema
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS plan_suscripcion_id UUID REFERENCES public.planes_suscripcion(id),
ADD COLUMN IF NOT EXISTS tipo_ecosistema_id UUID REFERENCES public.tipos_empresa_ecosistema(id),
ADD COLUMN IF NOT EXISTS fecha_suscripcion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
ADD COLUMN IF NOT EXISTS estado_suscripcion VARCHAR(20) DEFAULT 'activa',
ADD COLUMN IF NOT EXISTS configuracion_empresa JSONB DEFAULT '{}';

-- 6. Roles específicos dentro de cada empresa
CREATE TABLE IF NOT EXISTS public.roles_empresa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '{}',
    tipo_ecosistema_id UUID REFERENCES public.tipos_empresa_ecosistema(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(nombre, tipo_ecosistema_id)
);

-- 7. Insertar roles por tipo de empresa
DO $$
DECLARE
    planta_id UUID;
    transporte_id UUID;
    cliente_id UUID;
BEGIN
    -- Obtener IDs de tipos de empresa
    SELECT id INTO planta_id FROM public.tipos_empresa_ecosistema WHERE nombre = 'Planta';
    SELECT id INTO transporte_id FROM public.tipos_empresa_ecosistema WHERE nombre = 'Transporte';
    SELECT id INTO cliente_id FROM public.tipos_empresa_ecosistema WHERE nombre = 'Cliente';
    
    -- Roles para Planta
    INSERT INTO public.roles_empresa (nombre, descripcion, permisos, tipo_ecosistema_id) VALUES
    ('Gerente de Producción', 'Gestiona toda la producción y despachos', '{"full_access": true, "crear_despachos": true, "gestionar_produccion": true, "reportes_completos": true}', planta_id),
    ('Coordinador de Despachos', 'Coordina los despachos de la planta', '{"crear_despachos": true, "ver_transportes": true, "gestionar_cargas": true}', planta_id),
    ('Operador de Planta', 'Operario con acceso limitado', '{"ver_despachos": true, "actualizar_estado_carga": true}', planta_id)
    ON CONFLICT (nombre, tipo_ecosistema_id) DO NOTHING;
    
    -- Roles para Transporte
    INSERT INTO public.roles_empresa (nombre, descripcion, permisos, tipo_ecosistema_id) VALUES
    ('Gerente de Flota', 'Gestiona toda la flota y operaciones', '{"full_access": true, "gestionar_flota": true, "aceptar_despachos": true, "reportes_completos": true}', transporte_id),
    ('Despachador', 'Coordina rutas y asignaciones', '{"aceptar_despachos": true, "gestionar_rutas": true, "asignar_choferes": true}', transporte_id),
    ('Chofer', 'Conductor con acceso a sus viajes', '{"ver_mis_viajes": true, "actualizar_estado_viaje": true, "comunicar_incidencias": true}', transporte_id)
    ON CONFLICT (nombre, tipo_ecosistema_id) DO NOTHING;
    
    -- Roles para Cliente
    INSERT INTO public.roles_empresa (nombre, descripcion, permisos, tipo_ecosistema_id) VALUES
    ('Gerente de Logística', 'Gestiona recepción y logística', '{"full_access": true, "ver_despachos": true, "gestionar_recepciones": true, "reportes_completos": true}', cliente_id),
    ('Coordinador de Recepción', 'Coordina las recepciones', '{"ver_despachos": true, "actualizar_recepciones": true, "comunicar_incidencias": true}', cliente_id),
    ('Operador de Almacén', 'Operario de almacén', '{"ver_mis_recepciones": true, "confirmar_entregas": true}', cliente_id)
    ON CONFLICT (nombre, tipo_ecosistema_id) DO NOTHING;
END $$;

-- 8. Actualizar tabla usuarios_empresa para incluir rol específico
ALTER TABLE public.usuarios_empresa 
ADD COLUMN IF NOT EXISTS rol_empresa_id UUID REFERENCES public.roles_empresa(id),
ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
ADD COLUMN IF NOT EXISTS configuracion_usuario JSONB DEFAULT '{}';

-- 9. Función para crear empresa completa con plan y tipo
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

-- 10. Función para asignar usuario a empresa con rol
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

-- 11. Vista para consultar empresas con información completa
CREATE OR REPLACE VIEW public.view_empresas_completa AS
SELECT 
    e.id,
    e.nombre,
    e.cuit,
    e.email,
    e.telefono,
    e.direccion,
    e.activa,
    e.created_at,
    ps.nombre as plan_nombre,
    ps.precio_mensual,
    ps.caracteristicas as plan_caracteristicas,
    tee.nombre as tipo_ecosistema,
    tee.descripcion as tipo_descripcion,
    tee.permisos_base,
    e.estado_suscripcion,
    e.fecha_suscripcion,
    e.configuracion_empresa
FROM public.empresas e
LEFT JOIN public.planes_suscripcion ps ON e.plan_suscripcion_id = ps.id
LEFT JOIN public.tipos_empresa_ecosistema tee ON e.tipo_ecosistema_id = tee.id
WHERE e.activa = true;

-- 12. RLS para las nuevas tablas
ALTER TABLE public.planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_empresa_ecosistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_empresa ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (todos pueden leer, solo super admin puede modificar)
CREATE POLICY "Todos pueden ver planes de suscripción" ON public.planes_suscripcion FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver tipos de empresa" ON public.tipos_empresa_ecosistema FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver roles de empresa" ON public.roles_empresa FOR SELECT USING (true);

-- Solo super admin puede modificar estructura
CREATE POLICY "Solo super admin puede modificar planes" ON public.planes_suscripcion 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_sistema us 
        WHERE us.user_id = auth.uid() AND us.rol_sistema = 'super_admin'
    )
);

CREATE POLICY "Solo super admin puede modificar tipos empresa" ON public.tipos_empresa_ecosistema 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_sistema us 
        WHERE us.user_id = auth.uid() AND us.rol_sistema = 'super_admin'
    )
);

CREATE POLICY "Solo super admin puede modificar roles empresa" ON public.roles_empresa 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_sistema us 
        WHERE us.user_id = auth.uid() AND us.rol_sistema = 'super_admin'
    )
);

COMMENT ON TABLE public.planes_suscripcion IS 'Planes de suscripción disponibles para las empresas';
COMMENT ON TABLE public.tipos_empresa_ecosistema IS 'Tipos de empresa en el ecosistema Nodexia: Planta, Transporte, Cliente';
COMMENT ON TABLE public.roles_empresa IS 'Roles específicos dentro de cada tipo de empresa';
COMMENT ON FUNCTION crear_empresa_completa IS 'Crear una empresa completa con plan de suscripción y tipo de ecosistema';
COMMENT ON FUNCTION asignar_usuario_empresa IS 'Asignar un usuario a una empresa con un rol específico';
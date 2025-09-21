-- Estructura para soportar red de empresas y roles

-- 1. Tabla de empresas (entidades principales)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cuit TEXT UNIQUE NOT NULL,
    tipo_empresa TEXT NOT NULL CHECK (tipo_empresa IN ('transporte', 'coordinador')),
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    localidad TEXT,
    provincia TEXT,
    activa BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    usuario_admin UUID REFERENCES auth.users(id) -- Usuario administrador de la empresa
);

-- 2. Tabla de roles y permisos por tipo de empresa
CREATE TABLE IF NOT EXISTS public.roles_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_rol TEXT NOT NULL,
    tipo_empresa TEXT NOT NULL CHECK (tipo_empresa IN ('transporte', 'coordinador', 'ambos')),
    descripcion TEXT,
    permisos JSONB NOT NULL DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    UNIQUE(nombre_rol, tipo_empresa)
);

-- Insertar roles predefinidos
INSERT INTO public.roles_empresa (nombre_rol, tipo_empresa, descripcion, permisos) VALUES
-- Roles para empresas coordinadoras
('admin', 'coordinador', 'Administrador de empresa coordinadora', '{
    "ver_dashboard": true,
    "gestionar_usuarios": true,
    "gestionar_transportistas": true,
    "crear_despachos": true,
    "ver_reportes": true,
    "configurar_empresa": true,
    "gestionar_relaciones": true
}'),
('coordinador', 'coordinador', 'Coordinador de operaciones', '{
    "ver_dashboard": true,
    "crear_despachos": true,
    "asignar_transportistas": true,
    "ver_reportes": true,
    "gestionar_clientes": true
}'),
('control_acceso', 'coordinador', 'Control de acceso y seguridad', '{
    "ver_dashboard": true,
    "gestionar_accesos": true,
    "ver_reportes_seguridad": true,
    "validar_documentacion": true
}'),
('supervisor_carga', 'coordinador', 'Supervisor de carga y operaciones', '{
    "ver_dashboard": true,
    "supervisar_cargas": true,
    "validar_despachos": true,
    "ver_reportes_operativos": true,
    "gestionar_incidencias": true
}'),

-- Roles para empresas de transporte
('admin', 'transporte', 'Administrador de empresa de transporte', '{
    "ver_dashboard": true,
    "gestionar_usuarios": true,
    "gestionar_flota": true,
    "gestionar_choferes": true,
    "ver_reportes": true,
    "configurar_empresa": true,
    "gestionar_clientes": true
}'),
('coordinador', 'transporte', 'Coordinador de flota', '{
    "ver_dashboard": true,
    "gestionar_flota": true,
    "asignar_choferes": true,
    "ver_reportes_flota": true,
    "gestionar_despachos": true
}'),
('chofer', 'transporte', 'Chofer/Conductor', '{
    "ver_dashboard": true,
    "ver_mis_despachos": true,
    "actualizar_estado_viaje": true,
    "cargar_documentacion": true,
    "reportar_incidencias": true
}'),
('administrativo', 'transporte', 'Personal administrativo', '{
    "ver_dashboard": true,
    "gestionar_documentacion": true,
    "ver_reportes_admin": true,
    "gestionar_facturacion": true,
    "consultar_despachos": true
}'),

-- Roles generales (ambos tipos de empresa)
('operador', 'ambos', 'Operador general', '{
    "ver_dashboard": true,
    "consultar_despachos": true,
    "ver_reportes_basicos": true
}'),
('consulta', 'ambos', 'Solo consulta', '{
    "ver_dashboard": true,
    "consultar_despachos": true
}')
ON CONFLICT (nombre_rol, tipo_empresa) DO NOTHING;

-- 3. Tabla de usuarios de empresas (empleados/usuarios de cada empresa)
CREATE TABLE IF NOT EXISTS public.usuarios_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    empresa_id UUID REFERENCES public.empresas(id),
    rol_interno TEXT NOT NULL,
    nombre_completo TEXT,
    email_interno TEXT,
    telefono_interno TEXT,
    departamento TEXT,
    fecha_ingreso DATE,
    activo BOOLEAN DEFAULT true,
    fecha_vinculacion TIMESTAMPTZ DEFAULT NOW(),
    vinculado_por UUID REFERENCES auth.users(id),
    notas TEXT,
    UNIQUE(user_id, empresa_id)
);

-- 3. Tabla de relaciones entre empresas (red/comunidad)
CREATE TABLE IF NOT EXISTS public.relaciones_empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_cliente_id UUID REFERENCES public.empresas(id), -- Empresa que contrata
    empresa_transporte_id UUID REFERENCES public.empresas(id), -- Empresa que transporta
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva', 'pendiente')),
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    condiciones JSONB, -- Términos comerciales, tarifas, etc.
    UNIQUE(empresa_cliente_id, empresa_transporte_id)
);

-- 4. Modificar tabla choferes para vincular a empresa
ALTER TABLE public.choferes 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- Actualizar choferes existentes (temporal)
UPDATE public.choferes 
SET empresa_id = (
    SELECT e.id FROM public.empresas e 
    INNER JOIN public.usuarios_empresa ue ON e.id = ue.empresa_id 
    WHERE ue.user_id = choferes.id_transporte 
    LIMIT 1
) WHERE empresa_id IS NULL;

-- 5. Tabla de despachos con relación empresa-cliente
CREATE TABLE IF NOT EXISTS public.despachos_red (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_cliente_id UUID REFERENCES public.empresas(id) NOT NULL,
    empresa_transporte_id UUID REFERENCES public.empresas(id) NOT NULL,
    chofer_id UUID REFERENCES public.choferes(id),
    camion_id UUID REFERENCES public.camiones(id),
    acoplado_id UUID REFERENCES public.acoplados(id),
    origen TEXT NOT NULL,
    destino TEXT NOT NULL,
    fecha_despacho DATE NOT NULL,
    estado TEXT DEFAULT 'planificado' CHECK (estado IN ('planificado', 'asignado', 'en_ruta', 'entregado', 'cancelado')),
    observaciones TEXT,
    creado_por UUID REFERENCES auth.users(id),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS empresas_tipo_idx ON public.empresas(tipo_empresa);
CREATE INDEX IF NOT EXISTS usuarios_empresa_user_id_idx ON public.usuarios_empresa(user_id);
CREATE INDEX IF NOT EXISTS usuarios_empresa_empresa_id_idx ON public.usuarios_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS relaciones_empresas_cliente_idx ON public.relaciones_empresas(empresa_cliente_id);
CREATE INDEX IF NOT EXISTS relaciones_empresas_transporte_idx ON public.relaciones_empresas(empresa_transporte_id);
CREATE INDEX IF NOT EXISTS despachos_red_cliente_idx ON public.despachos_red(empresa_cliente_id);
CREATE INDEX IF NOT EXISTS despachos_red_transporte_idx ON public.despachos_red(empresa_transporte_id);
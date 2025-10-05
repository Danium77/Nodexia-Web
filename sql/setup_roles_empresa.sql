-- Script para verificar y crear roles_empresa
-- Verificar si existe la tabla roles_empresa
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'roles_empresa'
) as table_exists;

-- Si no existe, crearla
CREATE TABLE IF NOT EXISTS public.roles_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_rol TEXT NOT NULL,
    tipo_empresa TEXT NOT NULL CHECK (tipo_empresa IN ('transporte', 'coordinador', 'ambos')),
    descripcion TEXT,
    permisos JSONB NOT NULL DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    UNIQUE(nombre_rol, tipo_empresa)
);

-- Insertar roles básicos si no existen
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
('supervisor', 'coordinador', 'Supervisor de carga y operaciones', '{
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
('usuario', 'ambos', 'Usuario básico', '{
    "ver_dashboard": true,
    "consultar_despachos": true
}')
ON CONFLICT (nombre_rol, tipo_empresa) DO NOTHING;

-- Verificar la inserción
SELECT nombre_rol, tipo_empresa, descripcion FROM public.roles_empresa ORDER BY tipo_empresa, nombre_rol;
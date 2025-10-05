-- Script para verificar y crear la tabla roles_empresa
-- Ejecutar en Supabase Dashboard → SQL Editor

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS roles_empresa (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_rol VARCHAR(100) NOT NULL,
    tipo_empresa VARCHAR(20) NOT NULL CHECK (tipo_empresa IN ('coordinador', 'transporte', 'ambos')),
    descripcion TEXT,
    permisos JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_roles_empresa_tipo ON roles_empresa(tipo_empresa);
CREATE INDEX IF NOT EXISTS idx_roles_empresa_activo ON roles_empresa(activo);
CREATE INDEX IF NOT EXISTS idx_roles_empresa_nombre ON roles_empresa(nombre_rol, tipo_empresa);

-- Insertar roles por defecto si la tabla está vacía
INSERT INTO roles_empresa (nombre_rol, tipo_empresa, descripcion, permisos, activo)
SELECT * FROM (VALUES
    ('Administrador', 'coordinador', 'Acceso completo para empresas coordinadoras', 
     '{"despachos": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "usuarios": {"ver": true, "crear": true, "editar": true}}', 
     true),
    ('Coordinador', 'coordinador', 'Gestión de operaciones para empresas coordinadoras', 
     '{"despachos": {"ver": true, "crear": true, "editar": true, "eliminar": false}, "reportes": {"ver": true}}', 
     true),
    ('Administrador', 'transporte', 'Acceso completo para empresas de transporte', 
     '{"flota": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "choferes": {"ver": true, "crear": true, "editar": true}}', 
     true),
    ('Supervisor', 'transporte', 'Supervisión de flota para empresas de transporte', 
     '{"flota": {"ver": true, "crear": false, "editar": true, "eliminar": false}, "choferes": {"ver": true, "editar": true}}', 
     true),
    ('Chofer', 'transporte', 'Acceso básico para conductores', 
     '{"despachos": {"ver": true, "editar": false}}', 
     true),
    ('Administrador General', 'ambos', 'Acceso completo para cualquier tipo de empresa', 
     '{"despachos": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "flota": {"ver": true, "crear": true, "editar": true}, "usuarios": {"ver": true, "crear": true, "editar": true}}', 
     true)
) AS new_roles(nombre_rol, tipo_empresa, descripcion, permisos, activo)
WHERE NOT EXISTS (SELECT 1 FROM roles_empresa);

-- Verificar que se crearon los roles
SELECT 
    COUNT(*) as total_roles
FROM roles_empresa;

-- Mostrar todos los roles
SELECT 
    nombre_rol, 
    tipo_empresa, 
    descripcion
FROM roles_empresa;
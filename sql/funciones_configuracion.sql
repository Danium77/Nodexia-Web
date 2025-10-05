-- Función para configurar la estructura básica desde la interfaz web
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE FUNCTION configurar_estructura_empresas()
RETURNS TEXT AS $$
DECLARE
    resultado TEXT := '';
BEGIN
    -- Crear tabla empresas si no existe, o actualizar estructura si existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas' AND table_schema = 'public') THEN
        CREATE TABLE public.empresas (
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
            usuario_admin UUID REFERENCES auth.users(id)
        );
        resultado := resultado || 'Tabla empresas creada. ';
    ELSE
        -- Tabla existe, verificar y agregar columnas faltantes
        resultado := resultado || 'Tabla empresas ya existe. ';
        
        -- Agregar tipo_empresa si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'empresas' AND column_name = 'tipo_empresa' AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.empresas ADD COLUMN tipo_empresa TEXT;
            ALTER TABLE public.empresas ADD CONSTRAINT empresas_tipo_empresa_check 
                CHECK (tipo_empresa IN ('transporte', 'coordinador'));
            resultado := resultado || 'Columna tipo_empresa agregada. ';
        END IF;
        
        -- Agregar otras columnas si no existen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'telefono' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN telefono TEXT;
            resultado := resultado || 'Columna telefono agregada. ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'direccion' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN direccion TEXT;
            resultado := resultado || 'Columna direccion agregada. ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'localidad' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN localidad TEXT;
            resultado := resultado || 'Columna localidad agregada. ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'provincia' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN provincia TEXT;
            resultado := resultado || 'Columna provincia agregada. ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'activa' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN activa BOOLEAN DEFAULT true;
            resultado := resultado || 'Columna activa agregada. ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'fecha_creacion' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN fecha_creacion TIMESTAMPTZ DEFAULT NOW();
            resultado := resultado || 'Columna fecha_creacion agregada. ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'usuario_admin' AND table_schema = 'public') THEN
            ALTER TABLE public.empresas ADD COLUMN usuario_admin UUID REFERENCES auth.users(id);
            resultado := resultado || 'Columna usuario_admin agregada. ';
        END IF;
    END IF;

    -- Crear tabla usuarios_empresa si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_empresa' AND table_schema = 'public') THEN
        CREATE TABLE public.usuarios_empresa (
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
        resultado := resultado || 'Tabla usuarios_empresa creada. ';
    ELSE
        resultado := resultado || 'Tabla usuarios_empresa ya existe. ';
    END IF;

    -- Crear tabla roles_empresa si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles_empresa' AND table_schema = 'public') THEN
        CREATE TABLE public.roles_empresa (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre_rol TEXT NOT NULL,
            tipo_empresa TEXT NOT NULL CHECK (tipo_empresa IN ('transporte', 'coordinador', 'ambos')),
            descripcion TEXT,
            permisos JSONB NOT NULL DEFAULT '{}',
            activo BOOLEAN DEFAULT true,
            UNIQUE(nombre_rol, tipo_empresa)
        );
        
        -- Insertar roles básicos
        INSERT INTO public.roles_empresa (nombre_rol, tipo_empresa, descripcion, permisos) VALUES
        ('admin', 'coordinador', 'Administrador de empresa coordinadora', '{"ver_dashboard": true, "gestionar_usuarios": true, "crear_despachos": true}'),
        ('coordinador', 'coordinador', 'Coordinador de operaciones', '{"ver_dashboard": true, "crear_despachos": true}'),
        ('admin', 'transporte', 'Administrador de empresa de transporte', '{"ver_dashboard": true, "gestionar_usuarios": true, "gestionar_flota": true}'),
        ('chofer', 'transporte', 'Chofer/Conductor', '{"ver_dashboard": true, "ver_mis_despachos": true}'),
        ('operador', 'ambos', 'Operador general', '{"ver_dashboard": true, "consultar_despachos": true}')
        ON CONFLICT (nombre_rol, tipo_empresa) DO NOTHING;
        
        resultado := resultado || 'Tabla roles_empresa creada con roles básicos. ';
    ELSE
        resultado := resultado || 'Tabla roles_empresa ya existe. ';
    END IF;

    -- Crear tabla relaciones_empresas si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relaciones_empresas' AND table_schema = 'public') THEN
        CREATE TABLE public.relaciones_empresas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_cliente_id UUID REFERENCES public.empresas(id),
            empresa_transporte_id UUID REFERENCES public.empresas(id),
            estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva', 'pendiente')),
            fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
            fecha_fin TIMESTAMPTZ,
            condiciones JSONB,
            UNIQUE(empresa_cliente_id, empresa_transporte_id)
        );
        resultado := resultado || 'Tabla relaciones_empresas creada. ';
    ELSE
        resultado := resultado || 'Tabla relaciones_empresas ya existe. ';
    END IF;

    -- Crear tabla despachos_red si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'despachos_red' AND table_schema = 'public') THEN
        CREATE TABLE public.despachos_red (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_cliente_id UUID REFERENCES public.empresas(id) NOT NULL,
            empresa_transporte_id UUID REFERENCES public.empresas(id) NOT NULL,
            chofer_id UUID,
            camion_id UUID,
            acoplado_id UUID,
            origen TEXT NOT NULL,
            destino TEXT NOT NULL,
            fecha_despacho DATE NOT NULL,
            estado TEXT DEFAULT 'planificado' CHECK (estado IN ('planificado', 'asignado', 'en_ruta', 'entregado', 'cancelado')),
            observaciones TEXT,
            creado_por UUID REFERENCES auth.users(id),
            fecha_creacion TIMESTAMPTZ DEFAULT NOW()
        );
        resultado := resultado || 'Tabla despachos_red creada. ';
    ELSE
        resultado := resultado || 'Tabla despachos_red ya existe. ';
    END IF;

    -- Insertar empresas demo si no existen
    INSERT INTO public.empresas (nombre, cuit, tipo_empresa, email, telefono, direccion, localidad, provincia) 
    VALUES 
        ('Empresa Coordinadora Demo', '20-12345678-9', 'coordinador', 'contacto@coordinadora-demo.com', '+54 11 1234-5678', 'Av. Principal 123', 'Buenos Aires', 'CABA'),
        ('Transportes Demo SA', '30-87654321-2', 'transporte', 'admin@transportes-demo.com', '+54 11 8765-4321', 'Ruta 9 Km 45', 'San Martín', 'Buenos Aires')
    ON CONFLICT (cuit) DO NOTHING;

    resultado := resultado || 'Empresas demo configuradas.';
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para vincular usuarios existentes a empresas
CREATE OR REPLACE FUNCTION vincular_usuarios_demo()
RETURNS TEXT AS $$
DECLARE
    empresa_coordinadora_id UUID;
    empresa_transporte_id UUID;
    admin_user_id UUID;
    transporte_user_id UUID;
    resultado TEXT := '';
BEGIN
    -- Obtener IDs de empresas
    SELECT id INTO empresa_coordinadora_id FROM public.empresas WHERE cuit = '20-12345678-9';
    SELECT id INTO empresa_transporte_id FROM public.empresas WHERE cuit = '30-87654321-2';
    
    -- Obtener IDs de usuarios
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin.demo@nodexia.com';
    SELECT id INTO transporte_user_id FROM auth.users WHERE email = 'transporte.demo@nodexia.com';
    
    -- Vincular admin a empresa coordinadora
    IF admin_user_id IS NOT NULL AND empresa_coordinadora_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id, empresa_id, rol_interno, nombre_completo, email_interno, departamento, fecha_ingreso
        ) VALUES (
            admin_user_id, empresa_coordinadora_id, 'admin', 'Administrador Demo', 'admin.demo@coordinadora-demo.com', 'Administración', CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        UPDATE public.empresas SET usuario_admin = admin_user_id WHERE id = empresa_coordinadora_id;
        resultado := resultado || 'Admin vinculado a coordinadora. ';
    END IF;
    
    -- Vincular transporte a empresa de transporte
    IF transporte_user_id IS NOT NULL AND empresa_transporte_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id, empresa_id, rol_interno, nombre_completo, email_interno, departamento, fecha_ingreso
        ) VALUES (
            transporte_user_id, empresa_transporte_id, 'admin', 'Admin Transporte Demo', 'admin@transportes-demo.com', 'Administración', CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        UPDATE public.empresas SET usuario_admin = transporte_user_id WHERE id = empresa_transporte_id;
        resultado := resultado || 'Admin transporte vinculado. ';
    END IF;
    
    -- Crear relación entre empresas
    INSERT INTO public.relaciones_empresas (empresa_cliente_id, empresa_transporte_id, estado, condiciones)
    VALUES (empresa_coordinadora_id, empresa_transporte_id, 'activa', '{"tarifa_base": 1000}'::jsonb)
    ON CONFLICT (empresa_cliente_id, empresa_transporte_id) DO NOTHING;
    
    resultado := resultado || 'Relación comercial creada.';
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
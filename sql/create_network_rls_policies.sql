-- Políticas de Row Level Security (RLS) para la red de empresas

-- Habilitar RLS en todas las tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relaciones_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos_red ENABLE ROW LEVEL SECURITY;

-- Políticas para tabla EMPRESAS
-- Los usuarios solo pueden ver empresas donde tienen acceso
CREATE POLICY "Usuarios pueden ver sus empresas" ON public.empresas
    FOR SELECT USING (
        id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Administradores pueden actualizar su empresa
CREATE POLICY "Admins pueden actualizar su empresa" ON public.empresas
    FOR UPDATE USING (
        id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() AND rol_interno = 'admin'
        )
    );

-- Solo superadmin puede crear empresas (por ahora)
CREATE POLICY "Solo superadmin crea empresas" ON public.empresas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'superadmin'
        )
    );

-- Políticas para tabla ROLES_EMPRESA
-- Todos pueden ver los roles (son configuración pública)
CREATE POLICY "Todos pueden ver roles" ON public.roles_empresa
    FOR SELECT USING (activo = true);

-- Solo superadmin puede modificar roles
CREATE POLICY "Solo superadmin modifica roles" ON public.roles_empresa
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'superadmin'
        )
    );

-- Políticas para tabla USUARIOS_EMPRESA
-- Los usuarios pueden ver los usuarios de sus empresas
CREATE POLICY "Ver usuarios de mis empresas" ON public.usuarios_empresa
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Solo admins pueden gestionar usuarios de su empresa
CREATE POLICY "Admins gestionan usuarios" ON public.usuarios_empresa
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() 
            AND rol_interno = 'admin'
        )
    );

-- Políticas para tabla RELACIONES_EMPRESAS
-- Los usuarios pueden ver relaciones donde participan sus empresas
CREATE POLICY "Ver relaciones de mis empresas" ON public.relaciones_empresas
    FOR SELECT USING (
        empresa_cliente_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        ) OR
        empresa_transporte_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Solo coordinadores/admins pueden crear relaciones
CREATE POLICY "Coordinadores crean relaciones" ON public.relaciones_empresas
    FOR INSERT WITH CHECK (
        empresa_cliente_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() 
            AND rol_interno IN ('admin', 'coordinador')
        )
    );

-- Políticas para tabla DESPACHOS_RED
-- Los usuarios pueden ver despachos de sus empresas
CREATE POLICY "Ver despachos de red" ON public.despachos_red
    FOR SELECT USING (
        empresa_cliente_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        ) OR
        empresa_transporte_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Coordinadores pueden crear despachos
CREATE POLICY "Coordinadores crean despachos" ON public.despachos_red
    FOR INSERT WITH CHECK (
        empresa_cliente_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() 
            AND rol_interno IN ('admin', 'coordinador')
        )
    );

-- Transportistas pueden actualizar estado de despachos
CREATE POLICY "Transportistas actualizan despachos" ON public.despachos_red
    FOR UPDATE USING (
        empresa_transporte_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() 
            AND rol_interno IN ('admin', 'transporte', 'operador')
        )
    );

-- Actualizar política de choferes para empresa
DROP POLICY IF EXISTS "Users can view own choferes" ON public.choferes;
CREATE POLICY "Ver choferes de mi empresa" ON public.choferes
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own choferes" ON public.choferes;
CREATE POLICY "Crear choferes en mi empresa" ON public.choferes
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() 
            AND rol_interno IN ('admin', 'transporte', 'operador')
        )
    );

DROP POLICY IF EXISTS "Users can update own choferes" ON public.choferes;
CREATE POLICY "Actualizar choferes de mi empresa" ON public.choferes
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() 
            AND rol_interno IN ('admin', 'transporte', 'operador')
        )
    );
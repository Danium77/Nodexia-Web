-- Políticas de Row Level Security para Super Administración

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE public.planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_admin ENABLE ROW LEVEL SECURITY;

-- Políticas para PLANES_SUSCRIPCION
-- Todos pueden ver planes activos
CREATE POLICY "Todos pueden ver planes activos" ON public.planes_suscripcion
    FOR SELECT USING (activo = true);

-- Solo super admins pueden modificar planes
CREATE POLICY "Solo super admins modifican planes" ON public.planes_suscripcion
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Políticas para SUSCRIPCIONES_EMPRESA
-- Empresas pueden ver sus propias suscripciones
CREATE POLICY "Empresas ven sus suscripciones" ON public.suscripciones_empresa
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Solo super admins pueden modificar suscripciones
CREATE POLICY "Solo super admins modifican suscripciones" ON public.suscripciones_empresa
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Solo super admins actualizan suscripciones" ON public.suscripciones_empresa
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Políticas para PAGOS
-- Empresas pueden ver sus propios pagos
CREATE POLICY "Empresas ven sus pagos" ON public.pagos
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Solo super admins pueden gestionar pagos
CREATE POLICY "Solo super admins gestionan pagos" ON public.pagos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Políticas para SUPER_ADMINS
-- Solo super admins pueden ver otros super admins
CREATE POLICY "Solo super admins ven super admins" ON public.super_admins
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Solo super admins pueden modificar super admins
CREATE POLICY "Solo super admins modifican super admins" ON public.super_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Políticas para CONFIGURACION_SISTEMA
-- Solo super admins pueden acceder a configuración
CREATE POLICY "Solo super admins ven configuracion" ON public.configuracion_sistema
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Solo super admins modifican configuracion" ON public.configuracion_sistema
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Políticas para LOGS_ADMIN
-- Solo super admins pueden ver logs
CREATE POLICY "Solo super admins ven logs" ON public.logs_admin
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Todos los super admins pueden insertar logs (via funciones)
CREATE POLICY "Super admins insertan logs" ON public.logs_admin
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Actualizar política de empresas para que super admins vean todas
DROP POLICY IF EXISTS "Usuarios pueden ver sus empresas" ON public.empresas;
CREATE POLICY "Usuarios ven empresas permitidas" ON public.empresas
    FOR SELECT USING (
        id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Super admins pueden crear empresas directamente
DROP POLICY IF EXISTS "Solo superadmin crea empresas" ON public.empresas;
CREATE POLICY "Super admins crean empresas" ON public.empresas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Super admins pueden actualizar cualquier empresa
CREATE POLICY "Super admins actualizan empresas" ON public.empresas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        ) OR
        id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() AND rol_interno = 'admin'
        )
    );

-- Actualizar política de usuarios_empresa para super admins
CREATE POLICY "Super admins ven todos los usuarios" ON public.usuarios_empresa
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Super admins gestionan usuarios" ON public.usuarios_empresa
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresa 
            WHERE user_id = auth.uid() AND rol_interno = 'admin'
        ) OR
        EXISTS (
            SELECT 1 FROM public.super_admins 
            WHERE user_id = auth.uid() AND activo = true
        )
    );
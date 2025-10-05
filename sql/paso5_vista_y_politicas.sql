-- PASO 5: Crear vista y políticas de seguridad
-- Ejecutar después del PASO 4

-- Vista para consultar empresas con información completa
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

-- RLS para las nuevas tablas
ALTER TABLE public.planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_empresa_ecosistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_empresa ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (todos pueden leer, solo super admin puede modificar)
DROP POLICY IF EXISTS "Todos pueden ver planes de suscripción" ON public.planes_suscripcion;
CREATE POLICY "Todos pueden ver planes de suscripción" ON public.planes_suscripcion FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden ver tipos de empresa" ON public.tipos_empresa_ecosistema;
CREATE POLICY "Todos pueden ver tipos de empresa" ON public.tipos_empresa_ecosistema FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden ver roles de empresa" ON public.roles_empresa;
CREATE POLICY "Todos pueden ver roles de empresa" ON public.roles_empresa FOR SELECT USING (true);
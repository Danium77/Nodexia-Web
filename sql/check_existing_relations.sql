-- Ver todas las relaciones existentes
SELECT 
    'RELACIONES EXISTENTES' as status,
    re.id,
    ec.nombre as empresa_coordinadora,
    et.nombre as empresa_transporte,
    re.estado,
    re.fecha_inicio,
    re.activo,
    re.created_at
FROM public.relaciones_empresa re
JOIN public.empresas ec ON ec.id = re.empresa_coordinadora_id
JOIN public.empresas et ON et.id = re.empresa_transporte_id
ORDER BY re.created_at DESC;

-- Ver empresas de transporte disponibles (sin relación activa)
SELECT 
    'TRANSPORTES SIN RELACION' as status,
    e.nombre,
    e.id,
    e.cuit
FROM public.empresas e
WHERE e.tipo_empresa = 'transporte' 
AND e.activo = true
AND e.id NOT IN (
    SELECT re.empresa_transporte_id 
    FROM public.relaciones_empresa re 
    WHERE re.activo = true
);

-- Contar relaciones totales
SELECT 
    'RESUMEN' as info,
    COUNT(*) as total_relaciones,
    COUNT(CASE WHEN activo = true THEN 1 END) as relaciones_activas
FROM public.relaciones_empresa;
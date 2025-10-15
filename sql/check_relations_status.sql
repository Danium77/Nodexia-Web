-- Verificar el estado actual de todas las relaciones
SELECT 
    'TODAS_LAS_RELACIONES' as tipo,
    re.id,
    ec.nombre as empresa_coordinadora,
    et.nombre as empresa_transporte,
    re.estado,
    re.activo,
    re.fecha_inicio,
    re.fecha_fin,
    re.created_at,
    re.updated_at
FROM public.relaciones_empresa re
JOIN public.empresas ec ON ec.id = re.empresa_coordinadora_id
JOIN public.empresas et ON et.id = re.empresa_transporte_id
ORDER BY re.updated_at DESC;

-- Ver solo las relaciones que deberían aparecer (activas)
SELECT 
    'RELACIONES_ACTIVAS' as tipo,
    re.id,
    ec.nombre as empresa_coordinadora,
    et.nombre as empresa_transporte,
    re.estado,
    re.activo
FROM public.relaciones_empresa re
JOIN public.empresas ec ON ec.id = re.empresa_coordinadora_id
JOIN public.empresas et ON et.id = re.empresa_transporte_id
WHERE re.estado = 'activa' AND re.activo = true
ORDER BY re.created_at DESC;
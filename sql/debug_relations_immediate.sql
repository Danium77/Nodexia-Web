-- DIAGNÓSTICO INMEDIATO: Verificar estado real de las relaciones
SELECT 
    re.id,
    ec.nombre as coordinadora,
    et.nombre as transporte,
    re.estado,
    re.activo,
    re.fecha_fin,
    re.updated_at
FROM public.relaciones_empresa re
JOIN public.empresas ec ON ec.id = re.empresa_coordinadora_id
JOIN public.empresas et ON et.id = re.empresa_transporte_id
ORDER BY re.updated_at DESC LIMIT 10;

-- Ver qué devuelve exactamente la consulta del código
SELECT 
    'CONSULTA_DEL_CODIGO' as debug,
    re.*,
    ec.nombre as coord_nombre,
    et.nombre as trans_nombre
FROM public.relaciones_empresa re
JOIN public.empresas ec ON ec.id = re.empresa_coordinadora_id
JOIN public.empresas et ON et.id = re.empresa_transporte_id
WHERE re.estado = 'activa' AND re.activo = true;
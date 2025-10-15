-- PRUEBA DIRECTA: Actualizar manualmente una relación para confirmar permisos
-- Usar uno de los IDs que vimos: e37f6f38-50dd-4ff6-3e36-3837db548005 o 77e6397f-f82b-419f-bb84-e17ba6d2a175

UPDATE public.relaciones_empresa 
SET 
    estado = 'finalizada',
    activo = false,
    fecha_fin = '2025-10-10'
WHERE id = 'e37f6f38-50dd-4ff6-3e36-3837db548005';

-- Verificar si se actualizó
SELECT 
    'DESPUES_DE_UPDATE' as test,
    id,
    estado,
    activo,
    fecha_fin
FROM public.relaciones_empresa 
WHERE id = 'e37f6f38-50dd-4ff6-3e36-3837db548005';

-- Ver todas las relaciones después del update manual
SELECT 
    'TODAS_DESPUES_UPDATE' as test,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
ORDER BY updated_at DESC;
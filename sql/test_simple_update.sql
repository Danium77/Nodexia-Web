-- =============================================
-- TEST SIMPLE: Update básico para identificar el problema
-- =============================================

-- 1. Ver la relación específica ANTES del update
SELECT 
    'ANTES_UPDATE' as momento,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 2. UPDATE MUY SIMPLE - solo un campo
UPDATE public.relaciones_empresa 
SET estado = 'finalizada'
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 3. Verificar inmediatamente después
SELECT 
    'DESPUES_UPDATE_SIMPLE' as momento,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 4. Probar con el otro ID también
UPDATE public.relaciones_empresa 
SET estado = 'finalizada'
WHERE id IN ('77e6397f-f82b-419f-bb84-e17ba6d2a175', 'e17f6f30-69dd-48f6-9c86-383780648005');

-- 5. Ver todas las relaciones después
SELECT 
    'TODAS_DESPUES_UPDATES' as resultado,
    id,
    estado,
    activo,
    fecha_fin
FROM public.relaciones_empresa 
ORDER BY id;
-- SOLUCIÓN TEMPORAL: Deshabilitar triggers que bloquean el INSERT
-- Ejecutar en Supabase SQL Editor

-- 1. Listar todos los triggers en usuarios_empresa
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'usuarios_empresa'
AND NOT tgisinternal;

-- 2. Si encuentras un trigger llamado "validar_rol_trigger" o similar, deshabilitarlo:
-- ALTER TABLE public.usuarios_empresa DISABLE TRIGGER nombre_del_trigger;

-- 3. ALTERNATIVA: Hacer la función validar_rol_empresa más permisiva
-- (reemplaza la versión anterior)
CREATE OR REPLACE FUNCTION public.validar_rol_empresa(p_rol TEXT, p_tipo_empresa TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Siempre retornar true temporalmente para debugging
    -- RETURN TRUE;
    
    -- O usar la lógica correcta:
    RETURN EXISTS (
        SELECT 1 FROM public.roles_empresa 
        WHERE nombre_rol = p_rol 
        AND (tipo_empresa = p_tipo_empresa OR tipo_empresa = 'ambos')
        AND activo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Si hay un CHECK CONSTRAINT, removerlo temporalmente:
-- ALTER TABLE public.usuarios_empresa DROP CONSTRAINT IF EXISTS check_rol_valido;

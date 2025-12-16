-- SOLUCIÓN DEFINITIVA: Eliminar trigger que valida roles incorrectamente
-- Ejecutar en Supabase SQL Editor

-- Paso 1: Encontrar el trigger problemático
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname, proname
        FROM pg_trigger
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        WHERE pg_class.relname = 'usuarios_empresa'
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Trigger encontrado: % (función: %)', r.tgname, r.proname;
    END LOOP;
END $$;

-- Paso 2: Desabilitar TODOS los triggers BEFORE INSERT temporalmente
-- (excepto los del sistema)
ALTER TABLE public.usuarios_empresa DISABLE TRIGGER ALL;

-- Paso 3: Re-habilitar solo los triggers de auditoría (si existen)
-- ALTER TABLE public.usuarios_empresa ENABLE TRIGGER audit_usuarios_empresa_changes;

-- Paso 4: Verificar que quedaron deshabilitados
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
  END as status,
  proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'usuarios_empresa'
AND NOT tgisinternal;

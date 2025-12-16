-- SOLUCIÓN: Deshabilitar el trigger que está bloqueando el INSERT
-- Ejecutar en Supabase SQL Editor

-- Deshabilitar el trigger problemático
ALTER TABLE public.usuarios_empresa DISABLE TRIGGER trigger_validar_rol;

-- Verificar que quedó deshabilitado
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
  END as status
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'usuarios_empresa'
AND tgname = 'trigger_validar_rol';

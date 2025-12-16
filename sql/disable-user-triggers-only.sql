-- Deshabilitar solo triggers de USUARIO (no los del sistema)
-- Ejecutar en Supabase SQL Editor

-- Primero, listar los triggers de usuario (no internos)
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
  END as status,
  proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'usuarios_empresa'
AND NOT tgisinternal  -- Solo triggers de usuario
ORDER BY tgname;

-- Luego, deshabilitar cada trigger de usuario individualmente
-- Reemplaza 'nombre_del_trigger' con los nombres que aparezcan arriba
-- ALTER TABLE public.usuarios_empresa DISABLE TRIGGER nombre_del_trigger;

-- Si aparece un trigger, ejecútalo así:
-- Ejemplo: ALTER TABLE public.usuarios_empresa DISABLE TRIGGER validar_rol_usuario_trigger;

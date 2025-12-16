-- ELIMINACIÓN DEFINITIVA DEL TRIGGER PROBLEMÁTICO
-- Ejecutar en Supabase SQL Editor
-- Fecha: 15 de diciembre de 2025

-- 1. Eliminar el trigger
DROP TRIGGER IF EXISTS trigger_validar_rol ON public.usuarios_empresa;

-- 2. Verificar que se eliminó correctamente
SELECT 
  COUNT(*) as triggers_restantes
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'usuarios_empresa'
AND tgname = 'trigger_validar_rol'
AND NOT tgisinternal;
-- Debe retornar 0

-- 3. Opcional: Eliminar también la función si no se usa en otro lugar
-- (Primero verificar que no haya otros triggers usándola)
-- DROP FUNCTION IF EXISTS validar_rol_por_tipo_empresa();

-- 4. Agregar comentario en la tabla documentando el cambio
COMMENT ON TABLE public.usuarios_empresa IS 
'Relación de usuarios con empresas. 
Trigger trigger_validar_rol eliminado el 15/12/2025 - validación de roles se hace en API (nueva-invitacion.ts).
Si se necesita recrear el trigger en el futuro, ver: SESION-DEBUG-CREACION-USUARIOS-15-DIC-2025.md';

-- ✅ LISTO - Ahora puedes crear usuarios sin problemas

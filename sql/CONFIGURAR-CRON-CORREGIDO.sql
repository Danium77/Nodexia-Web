-- ============================================================================
-- CONFIGURAR pg_cron - VERSIÓN CORREGIDA
-- ============================================================================

-- 1. Habilitar extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Eliminar job anterior si existe (ignorar error si no existe)
DO $$
BEGIN
  PERFORM cron.unschedule('actualizar-estados-viajes');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorar error si el job no existe
END $$;

-- 3. Crear job que se ejecuta cada 5 minutos
SELECT cron.schedule(
  'actualizar-estados-viajes',
  '*/5 * * * *',
  $$SELECT ejecutar_expiracion_viajes()$$
);

-- 4. Verificar que el job fue creado
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job
WHERE jobname = 'actualizar-estados-viajes';

-- 5. Información del cron
SELECT 
  '✅ Job configurado' as status,
  'Se ejecutará cada 5 minutos' as frecuencia,
  'Revisa viajes vencidos y actualiza estados' as accion;

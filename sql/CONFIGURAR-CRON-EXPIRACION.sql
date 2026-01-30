-- ============================================================================
-- CONFIGURAR pg_cron PARA EXPIRACIÓN AUTOMÁTICA
-- ============================================================================
-- Ejecuta actualizar_estados_viajes() cada 5 minutos automáticamente
-- ============================================================================

-- Habilitar extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar job anterior si existe
SELECT cron.unschedule('actualizar-estados-viajes');

-- Crear job que se ejecuta cada 5 minutos
SELECT cron.schedule(
  'actualizar-estados-viajes',
  '*/5 * * * *', -- Cada 5 minutos
  $$SELECT ejecutar_expiracion_viajes()$$
);

-- Ver jobs programados
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'actualizar-estados-viajes';

-- Ver últimas ejecuciones (después de que pasen 5 minutos)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'actualizar-estados-viajes')
ORDER BY start_time DESC
LIMIT 10;

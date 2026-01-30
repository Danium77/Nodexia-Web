-- Actualizar el job de pg_cron con la nueva función
SELECT cron.unschedule('actualizar-estados-viajes');

SELECT cron.schedule(
  'actualizar-estados-viajes',
  '*/5 * * * *',
  $$SELECT * FROM actualizar_estados_viajes()$$
);

-- Verificar job
SELECT jobid, schedule, command, active
FROM cron.job
WHERE jobname = 'actualizar-estados-viajes';

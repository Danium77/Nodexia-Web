-- ============================================================
-- BLOQUE 3: Activar cron jobs
-- ANTES de ejecutar esto, habilitar pg_cron en:
-- Supabase Dashboard → Database → Extensions → buscar pg_cron → Toggle ON
-- DESPUES copiar todo y pegar en SQL Editor → Run
-- ============================================================

SELECT cron.schedule('limpieza-tracking-gps', '0 3 * * 0', 'SELECT limpiar_tracking_antiguo()');
SELECT cron.schedule('limpieza-ubicaciones', '0 3 * * 0', 'SELECT limpiar_ubicaciones_antiguas()');
SELECT cron.schedule('limpieza-notificaciones', '0 4 * * *', 'SELECT limpiar_notificaciones_antiguas()');

-- SQL migration: Create RPC get_dashboard_kpis
-- This function returns a JSON object with basic KPIs for the dashboard.
-- It is SECURITY DEFINER and should be owned by postgres. After applying, consider
-- running: ALTER FUNCTION public.get_dashboard_kpis() OWNER TO postgres;
-- and: GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis() TO authenticated;

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS TABLE(
  scheduledtoday integer,
  intransit integer,
  openincidents integer,
  ontimepct integer
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  WITH
  today AS (SELECT (now() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date as d),
  s AS (
    SELECT count(*) AS cnt
    FROM public.despachos d
    JOIN today t ON TRUE
    WHERE (d.scheduled_local_date = t.d)
  ),
  it AS (
    SELECT count(*) AS cnt FROM public.despachos WHERE estado IN ('en_transito','transito')
  ),
  oi AS (
    SELECT count(*) AS cnt FROM public.incidencias WHERE resolved = false OR resolved IS NULL
  ),
  ot AS (
    -- Simplified on-time calc: count despachos with estado 'entregado_a_tiempo' / total
    SELECT
      CASE WHEN total=0 THEN 100 ELSE round(100.0 * ontime::numeric / total)::int END AS pct
    FROM (
      SELECT
        SUM(CASE WHEN estado IN ('entregado','entregado_a_tiempo') THEN 1 ELSE 0 END) as ontime,
        COUNT(*) as total
      FROM public.despachos
      WHERE scheduled_at IS NOT NULL
    ) q
  )
  SELECT s.cnt, it.cnt, oi.cnt, ot.pct FROM s, it, oi, ot;
$function$;

COMMIT;

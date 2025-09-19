-- 0003_backfill_and_triggers_scheduled_local.sql
-- Adds scheduled_local_date/time to despachos and recepciones, backfills data,
-- and creates trigger function to maintain local columns on insert/update.

BEGIN;

-- 1) Add columns if they don't exist (despachos)
ALTER TABLE IF EXISTS public.despachos
  ADD COLUMN IF NOT EXISTS scheduled_local_date date,
  ADD COLUMN IF NOT EXISTS scheduled_local_time time;

-- 2) Add columns if they don't exist (recepciones)
ALTER TABLE IF EXISTS public.recepciones
  ADD COLUMN IF NOT EXISTS scheduled_local_date date,
  ADD COLUMN IF NOT EXISTS scheduled_local_time time;

-- 3) Backfill despachos from scheduled_at (UTC -> America/Argentina/Buenos_Aires)
UPDATE public.despachos
SET
  scheduled_local_date = (scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  scheduled_local_time = (scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::time(0)
WHERE scheduled_at IS NOT NULL
  AND (scheduled_local_date IS NULL OR scheduled_local_time IS NULL);

-- 4) Backfill recepciones from scheduled_at (UTC -> America/Argentina/Buenos_Aires)
UPDATE public.recepciones
SET
  scheduled_local_date = (scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  scheduled_local_time = (scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::time(0)
WHERE scheduled_at IS NOT NULL
  AND (scheduled_local_date IS NULL OR scheduled_local_time IS NULL);

-- 5) Create trigger function to populate local columns on insert/update
CREATE OR REPLACE FUNCTION public.set_scheduled_local_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (NEW.scheduled_at IS NOT NULL) THEN
    NEW.scheduled_local_date := (NEW.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    NEW.scheduled_local_time := (NEW.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::time(0);
  END IF;
  RETURN NEW;
END;
$function$;

-- 6) Attach triggers to both tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_scheduled_local_despachos') THEN
    CREATE TRIGGER trg_set_scheduled_local_despachos
    BEFORE INSERT OR UPDATE ON public.despachos
    FOR EACH ROW EXECUTE FUNCTION public.set_scheduled_local_columns();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recepciones') AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_scheduled_local_recepciones') THEN
    CREATE TRIGGER trg_set_scheduled_local_recepciones
    BEFORE INSERT OR UPDATE ON public.recepciones
    FOR EACH ROW EXECUTE FUNCTION public.set_scheduled_local_columns();
  END IF;
END$$;

-- 7) Create indexes
CREATE INDEX IF NOT EXISTS idx_despachos_scheduled_local_date ON public.despachos (scheduled_local_date);
CREATE INDEX IF NOT EXISTS idx_recepciones_scheduled_local_date ON public.recepciones (scheduled_local_date);

COMMIT;

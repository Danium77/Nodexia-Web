-- Migration: Add local date/time columns to despachos
-- Adds scheduled_local_date (date) and scheduled_local_time (time without time zone)
-- Backfills existing rows using scheduled_at interpreted as UTC -> local date/time in the DB server timezone

BEGIN;

ALTER TABLE IF EXISTS public.despachos
  ADD COLUMN IF NOT EXISTS scheduled_local_date date,
  ADD COLUMN IF NOT EXISTS scheduled_local_time time;

-- Backfill: if scheduled_at is present, set scheduled_local_date and scheduled_local_time
-- We convert scheduled_at to the Argentina/Buenos_Aires timezone to obtain local date/time values.

UPDATE public.despachos
SET
  scheduled_local_date = (scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  scheduled_local_time = (scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::time
WHERE scheduled_at IS NOT NULL
  AND (scheduled_local_date IS NULL OR scheduled_local_time IS NULL);

COMMIT;

-- NOTE: After running this migration in Supabase SQL editor, consider creating an index if you will query by scheduled_local_date:
-- CREATE INDEX IF NOT EXISTS idx_despachos_scheduled_local_date ON public.despachos (scheduled_local_date);

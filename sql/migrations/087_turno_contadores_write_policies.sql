-- ============================================================
-- 087: Disable RLS on turno_contadores
-- This table only holds auto-increment counters managed by
-- the trigger fn_generar_numero_turno. No sensitive data.
-- SECURITY DEFINER + RLS policies proved unreliable in
-- Supabase's PostgREST/pooler setup, so we disable RLS.
-- ============================================================

ALTER TABLE turno_contadores DISABLE ROW LEVEL SECURITY;

-- Register migration
INSERT INTO schema_migrations (version, name, filename, checksum, applied_at)
VALUES (87, 'turno_contadores_disable_rls', '087_turno_contadores_write_policies.sql', md5('087_turno_contadores_disable_rls')::text, now())
ON CONFLICT (version) DO NOTHING;

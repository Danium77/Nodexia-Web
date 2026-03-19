-- ============================================================================
-- Migration 084: Fix infinite recursion in RLS policies (despachos ↔ viajes_despacho)
-- ============================================================================
-- Problem: UPDATE on despachos triggers error 42P17 "infinite recursion"
-- Root cause: despachos UPDATE policy queries viajes_despacho, and
-- viajes_despacho SELECT policies ("viajes_lectura" + "Vendedor ve viajes...")
-- query back into despachos → circular reference → PostgreSQL aborts.
--
-- Fix: Drop the two redundant SELECT policies on viajes_despacho.
-- They are dead code because migration 073 created a broader permissive policy
-- "Usuarios autenticados pueden ver viajes" with USING (auth.uid() IS NOT NULL)
-- which already grants SELECT to all authenticated users (OR'd with the others).
-- ============================================================================

-- 1. Drop "viajes_lectura" — references despachos table (recursion trigger)
DROP POLICY IF EXISTS "viajes_lectura" ON viajes_despacho;

-- 2. Drop "Vendedor ve viajes de despachos de sus clientes" — references despachos (recursion trigger)
DROP POLICY IF EXISTS "Vendedor ve viajes de despachos de sus clientes" ON viajes_despacho;

-- Remaining SELECT policy on viajes_despacho:
--   "Usuarios autenticados pueden ver viajes" → USING (auth.uid() IS NOT NULL)
-- This is sufficient and does NOT reference despachos → no recursion.

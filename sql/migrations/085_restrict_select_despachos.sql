-- ============================================================================
-- Migration 085: Restrict SELECT policy on despachos
-- ============================================================================
-- Problem: "Usuarios autenticados ven despachos" uses USING (true),
-- allowing any authenticated user to see ALL despachos from ALL empresas.
-- 
-- Fix: Replace with a proper policy that restricts visibility to:
-- 1. User created the despacho (created_by)
-- 2. User belongs to the empresa that owns the despacho (empresa_id)
-- 3. User belongs to the transport company assigned (transport_id)
-- 4. User is a chofer assigned to a viaje of the despacho
-- 5. Vendedor policy already exists separately
--
-- NOTE: We avoid referencing viajes_despacho here to prevent circular
-- recursion (despachos SELECT -> viajes_despacho -> despachos).
-- Instead, transport users see despachos via transport_id match.
-- ============================================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Usuarios autenticados ven despachos" ON despachos;

-- Create restricted SELECT policy
CREATE POLICY "Usuarios ven despachos de su empresa"
ON despachos FOR SELECT TO authenticated
USING (
  -- 1. Creator always sees their own despachos
  created_by = auth.uid()
  OR
  -- 2. Users of the empresa that owns the despacho
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = despachos.empresa_id
      AND ue.activo = true
  )
  OR
  -- 3. Users of the transport company assigned to the despacho
  (
    despachos.transport_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.empresa_id = despachos.transport_id
        AND ue.activo = true
    )
  )
  OR
  -- 4. Admin nodexia sees everything
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno = 'admin_nodexia'
      AND ue.activo = true
  )
);

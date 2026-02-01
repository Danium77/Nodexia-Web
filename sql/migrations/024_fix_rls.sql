-- Fix para Migración 024: Solo las políticas RLS corregidas
-- Ejecutar después de que la migración 024 falló
-- Fecha: 2026-02-01

-- Primero eliminar la policy incorrecta si existe
DROP POLICY IF EXISTS "Usuarios ven tracking de su empresa" ON tracking_gps;

-- Crear policy corregida
CREATE POLICY "Usuarios ven tracking de su empresa"
ON tracking_gps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM choferes c
    JOIN usuarios_empresa ue ON c.empresa_id = ue.empresa_id
    WHERE c.id = tracking_gps.chofer_id
      AND ue.user_id = auth.uid()
  )
);

-- Verificación
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'tracking_gps';

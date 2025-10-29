-- ============================================
-- FASE 8: Políticas RLS para solicitudes_registro
-- ============================================

-- Habilitar RLS
ALTER TABLE solicitudes_registro ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Admins pueden ver todas las solicitudes" ON solicitudes_registro;
DROP POLICY IF EXISTS "Permitir lectura pública" ON solicitudes_registro;
DROP POLICY IF EXISTS "Permitir inserción pública" ON solicitudes_registro;
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON solicitudes_registro;

-- ============================================
-- POLÍTICA 1: Lectura para usuarios autenticados
-- ============================================
-- Permite que cualquier usuario autenticado lea todas las solicitudes
-- (Los admins están autenticados, así que pueden leer)
CREATE POLICY "Permitir lectura a usuarios autenticados"
  ON solicitudes_registro
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- POLÍTICA 2: Inserción pública (signup)
-- ============================================
-- Permite que usuarios anónimos (público) inserten solicitudes desde /signup
CREATE POLICY "Permitir inserción pública"
  ON solicitudes_registro
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================
-- POLÍTICA 3: Actualización solo para admins
-- ============================================
-- Permite que usuarios con rol super_admin actualicen solicitudes (aprobar/rechazar)
CREATE POLICY "Admins pueden actualizar solicitudes"
  ON solicitudes_registro
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('admin', 'super_admin')
    )
  );

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'solicitudes_registro';

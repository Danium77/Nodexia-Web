-- Script para verificar y configurar permisos de documentos para usuarios de transporte

-- 1. Verificar si existen roles básicos
INSERT INTO public.roles (name) VALUES 
('admin'),
('coordinador'), 
('transporte')
ON CONFLICT (name) DO NOTHING;

-- 2. Verificar estructura de usuario transporte.demo
-- (Este paso se haría manualmente en Supabase o con un script específico)

-- 3. Aplicar políticas RLS para tabla documentos
-- Habilitar RLS en la tabla documentos
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes si las hay
DROP POLICY IF EXISTS "Users can insert their own documents" ON documentos;
DROP POLICY IF EXISTS "Users can view their own documents" ON documentos;
DROP POLICY IF EXISTS "Users can update their own documents" ON documentos;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documentos;
DROP POLICY IF EXISTS "Admins can view all documents" ON documentos;
DROP POLICY IF EXISTS "Coordinators can view transport documents" ON documentos;

-- Política para permitir que los usuarios autenticados inserten documentos
-- Un usuario puede insertar documentos donde él es el usuario_subio
CREATE POLICY "Users can insert their own documents" ON documentos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_subio);

-- Política para permitir que los usuarios lean sus propios documentos
CREATE POLICY "Users can view their own documents" ON documentos
FOR SELECT
TO authenticated
USING (auth.uid() = usuario_subio);

-- Política para permitir que los usuarios actualicen sus propios documentos
CREATE POLICY "Users can update their own documents" ON documentos
FOR UPDATE
TO authenticated
USING (auth.uid() = usuario_subio)
WITH CHECK (auth.uid() = usuario_subio);

-- Política para permitir que los usuarios eliminen sus propios documentos
CREATE POLICY "Users can delete their own documents" ON documentos
FOR DELETE
TO authenticated
USING (auth.uid() = usuario_subio);

-- Política adicional para admins: pueden ver todos los documentos
CREATE POLICY "Admins can view all documents" ON documentos
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profile_users pu
        JOIN roles r ON pu.role_id = r.id
        WHERE pu.user_id = auth.uid()
        AND r.name = 'admin'
    )
);

-- Política adicional para coordinadores: pueden ver documentos de transporte
CREATE POLICY "Coordinators can view transport documents" ON documentos
FOR SELECT
TO authenticated
USING (
    entidad = 'transporte' AND
    EXISTS (
        SELECT 1 FROM profile_users pu
        JOIN roles r ON pu.role_id = r.id
        WHERE pu.user_id = auth.uid()
        AND r.name IN ('coordinador', 'admin')
    )
);

-- 4. Verificación de políticas de Storage para bucket 'documentacion-general'
-- (Esto debe configurarse en la interfaz de Supabase Storage)
-- Las políticas de Storage deberían permitir:
-- - INSERT para usuarios autenticados
-- - SELECT para el dueño del archivo
-- - UPDATE para el dueño del archivo  
-- - DELETE para el dueño del archivo
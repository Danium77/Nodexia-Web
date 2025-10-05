-- Políticas RLS para la tabla documentos
-- Habilitar RLS en la tabla documentos
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

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
-- (Esta política permite a los usuarios con rol 'admin' ver todos los documentos)
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
-- =====================================================
-- POLÍTICAS DE STORAGE PARA BUCKET: remitos
-- =====================================================
-- 
-- PREREQUISITO: Crear el bucket "remitos" en Supabase Dashboard primero
-- Dashboard > Storage > Create new bucket > Nombre: remitos, Public: NO
--
-- Luego ejecutar este script en SQL Editor
-- =====================================================

-- Policy: Los usuarios pueden subir archivos a viajes de su empresa
CREATE POLICY "Usuarios suben remitos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'remitos'
  AND (storage.foldername(name))[1] IN (
    SELECT vd.id::TEXT
    FROM viajes_despacho vd
    INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE ue.user_id = auth.uid()
    AND ue.activo = TRUE
  )
);

-- Policy: Los usuarios pueden ver archivos de viajes de su empresa
CREATE POLICY "Usuarios ven remitos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'remitos'
  AND (storage.foldername(name))[1] IN (
    SELECT vd.id::TEXT
    FROM viajes_despacho vd
    INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE ue.user_id = auth.uid()
    AND ue.activo = TRUE
  )
);

-- Policy: Administradores pueden eliminar archivos de su empresa
CREATE POLICY "Admins eliminan remitos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'remitos'
  AND (storage.foldername(name))[1] IN (
    SELECT vd.id::TEXT
    FROM viajes_despacho vd
    INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE ue.user_id = auth.uid()
    AND ue.activo = TRUE
    AND ue.rol_interno IN ('administrador_transporte', 'supervisor_transporte')
  )
);

-- Comentarios
COMMENT ON POLICY "Usuarios suben remitos" ON storage.objects IS 'Permite a usuarios subir documentos solo a viajes de su empresa';
COMMENT ON POLICY "Usuarios ven remitos" ON storage.objects IS 'Permite a usuarios ver documentos solo de viajes de su empresa';
COMMENT ON POLICY "Admins eliminan remitos" ON storage.objects IS 'Permite a administradores eliminar documentos de viajes de su empresa';

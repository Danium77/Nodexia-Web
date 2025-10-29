-- =====================================================
-- TABLA: documentos_viaje
-- Descripción: Documentación de viajes (remitos, comprobantes, fotos)
-- =====================================================

-- Crear tabla documentos_viaje
CREATE TABLE IF NOT EXISTS documentos_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'remito', 'comprobante', 'foto_carga', 'foto_descarga', 'firma', 'otro'
  nombre_archivo VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- Tamaño en bytes
  mime_type VARCHAR(100),
  
  -- Metadatos
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  descripcion TEXT,
  
  -- Validación de tipo
  CHECK (tipo IN ('remito', 'comprobante', 'foto_carga', 'foto_descarga', 'firma', 'otro'))
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_documentos_viaje_id ON documentos_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos_viaje(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_uploaded_by ON documentos_viaje(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documentos_uploaded_at ON documentos_viaje(uploaded_at DESC);

-- =====================================================
-- RLS POLICIES para documentos_viaje
-- =====================================================

ALTER TABLE documentos_viaje ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver documentos de viajes de su empresa
CREATE POLICY "Usuarios ven documentos de su empresa"
  ON documentos_viaje
  FOR SELECT
  USING (
    viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
      WHERE ue.user_id = auth.uid()
      AND ue.activo = TRUE
    )
  );

-- Policy: Los usuarios pueden subir documentos a viajes de su empresa
CREATE POLICY "Usuarios suben documentos"
  ON documentos_viaje
  FOR INSERT
  WITH CHECK (
    viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
      WHERE ue.user_id = auth.uid()
      AND ue.activo = TRUE
    )
  );

-- Policy: Los usuarios pueden actualizar sus propios documentos
CREATE POLICY "Usuarios actualizan sus documentos"
  ON documentos_viaje
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Administradores pueden eliminar documentos de su empresa
CREATE POLICY "Admins eliminan documentos"
  ON documentos_viaje
  FOR DELETE
  USING (
    viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
      WHERE ue.user_id = auth.uid()
      AND ue.activo = TRUE
      AND ue.rol_interno IN ('administrador_transporte', 'supervisor_transporte')
    )
  );

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para obtener documentos de un viaje
CREATE OR REPLACE FUNCTION get_documentos_viaje(p_viaje_id UUID)
RETURNS TABLE (
  id UUID,
  tipo VARCHAR,
  nombre_archivo VARCHAR,
  file_url TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  uploaded_by_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dv.id,
    dv.tipo,
    dv.nombre_archivo,
    dv.file_url,
    dv.file_size,
    dv.uploaded_at,
    COALESCE(ue.nombre_completo, u.email) as uploaded_by_name
  FROM documentos_viaje dv
  LEFT JOIN auth.users u ON u.id = dv.uploaded_by
  LEFT JOIN usuarios_empresa ue ON ue.user_id = dv.uploaded_by
  WHERE dv.viaje_id = p_viaje_id
  ORDER BY dv.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear notificación al subir documento
CREATE OR REPLACE FUNCTION notificar_documento_subido()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido_id VARCHAR(50);
  v_numero_viaje INTEGER;
  v_empresa_id UUID;
BEGIN
  -- Obtener datos del viaje
  SELECT 
    d.pedido_id,
    vd.numero_viaje,
    vd.id_transporte
  INTO v_pedido_id, v_numero_viaje, v_empresa_id
  FROM viajes_despacho vd
  INNER JOIN despachos d ON d.id = vd.despacho_id
  WHERE vd.id = NEW.viaje_id;
  
  -- Notificar a coordinadores de la empresa
  INSERT INTO notificaciones (
    user_id,
    empresa_id,
    tipo,
    titulo,
    mensaje,
    viaje_id,
    pedido_id
  )
  SELECT 
    ue.user_id,
    v_empresa_id,
    'documento_subido',
    'Nuevo documento subido',
    format('Se subió un %s para el viaje #%s (Pedido: %s)', NEW.tipo, v_numero_viaje, v_pedido_id),
    NEW.viaje_id,
    v_pedido_id
  FROM usuarios_empresa ue
  WHERE ue.empresa_id = v_empresa_id
  AND ue.activo = TRUE
  AND ue.rol_interno IN ('administrador_transporte', 'supervisor_transporte')
  AND ue.user_id != COALESCE(NEW.uploaded_by, '00000000-0000-0000-0000-000000000000'::UUID);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para notificar documentos subidos
DROP TRIGGER IF EXISTS trigger_notificar_documento ON documentos_viaje;
CREATE TRIGGER trigger_notificar_documento
  AFTER INSERT ON documentos_viaje
  FOR EACH ROW
  EXECUTE FUNCTION notificar_documento_subido();

-- =====================================================
-- STORAGE BUCKET SETUP (ejecutar en Supabase Dashboard)
-- =====================================================

/*
-- En Supabase Dashboard > Storage > Create new bucket:
-- Bucket name: remitos
-- Public: false (privado)

-- Políticas de Storage (ejecutar en SQL Editor):

-- Policy: Los usuarios pueden subir archivos a su empresa
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

-- Policy: Los usuarios pueden ver archivos de su empresa
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

-- Policy: Admins pueden eliminar archivos
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
*/

-- Comentarios
COMMENT ON TABLE documentos_viaje IS 'Documentación asociada a viajes (remitos, comprobantes, fotos)';
COMMENT ON COLUMN documentos_viaje.tipo IS 'Tipo de documento: remito, comprobante, foto_carga, foto_descarga, firma, otro';
COMMENT ON COLUMN documentos_viaje.file_url IS 'URL del archivo en Supabase Storage';
COMMENT ON FUNCTION get_documentos_viaje IS 'Obtiene todos los documentos de un viaje con información del usuario que lo subió';
COMMENT ON FUNCTION notificar_documento_subido IS 'Crea notificaciones cuando se sube un nuevo documento';

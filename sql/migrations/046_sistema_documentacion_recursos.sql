-- =====================================================
-- MIGRATION 046: Sistema de Documentación de Recursos
-- Fecha: 08-Feb-2026
-- Propósito: Crear sistema para validación de documentación de choferes y camiones
-- =====================================================

-- CONTEXTO:
-- Admin Nodexia valida documentos (licencias, VTV, seguros, etc.) y habilita recursos
-- Control de Acceso solo verifica el estado general (OK/Con problemas)
-- Si hay problemas → genera incidencia para Coordinador de Planta

-- =====================================================
-- PASO 1: Crear tabla documentos_recursos
-- =====================================================

CREATE TABLE IF NOT EXISTS documentos_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recurso al que pertenece
  recurso_tipo VARCHAR(20) NOT NULL CHECK (recurso_tipo IN ('chofer', 'camion', 'acoplado')),
  recurso_id UUID NOT NULL, -- ID del chofer, camión o acoplado
  
  -- Tipo de documento
  tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN (
    -- Documentos de chofer
    'licencia_conducir',
    'carnet_psicofisico',
    'curso_mercancia_peligrosa',
    'habilitacion_senasa',
    'certificado_antecedentes',
    
    -- Documentos de camión/acoplado
    'vtv',
    'seguro',
    'habilitacion_ruta',
    'rto',
    'tarjeta_verde',
    'certificado_gnc',
    
    -- Otros
    'otro'
  )),
  
  -- Archivo
  nombre_archivo VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Estado y validación
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'validado', 'rechazado', 'vencido')),
  fecha_emision DATE,
  fecha_vencimiento DATE,
  validado_por UUID REFERENCES auth.users(id),
  validado_at TIMESTAMPTZ,
  motivo_rechazo TEXT,
  
  -- Criticidad
  es_critico BOOLEAN DEFAULT TRUE, -- Si es crítico, bloquea operaciones
  
  -- Metadata
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices compuestos
  UNIQUE(recurso_tipo, recurso_id, tipo_documento)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_doc_recursos_recurso ON documentos_recursos(recurso_tipo, recurso_id);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_tipo ON documentos_recursos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_estado ON documentos_recursos(estado);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_vencimiento ON documentos_recursos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_empresa ON documentos_recursos(empresa_id);

COMMENT ON TABLE documentos_recursos IS 'Documentación de choferes, camiones y acoplados validada por Admin Nodexia';
COMMENT ON COLUMN documentos_recursos.es_critico IS 'Si TRUE, la falta o vencimiento de este documento bloquea operaciones';

-- =====================================================
-- PASO 2: Función para verificar estado de documentación
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_estado_documentacion_recurso(
  p_recurso_tipo VARCHAR,
  p_recurso_id UUID
)
RETURNS TABLE (
  estado_general VARCHAR,
  documentos_criticos_faltantes INTEGER,
  documentos_vencidos INTEGER,
  documentos_por_vencer INTEGER,
  detalles JSONB
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_criticos INTEGER;
  v_criticos_ok INTEGER;
  v_vencidos INTEGER;
  v_por_vencer INTEGER;
  v_estado VARCHAR;
BEGIN
  -- Contar documentos críticos requeridos según tipo de recurso
  SELECT COUNT(*) INTO v_total_criticos
  FROM (
    SELECT UNNEST(CASE 
      WHEN p_recurso_tipo = 'chofer' THEN ARRAY['licencia_conducir', 'carnet_psicofisico']
      WHEN p_recurso_tipo = 'camion' THEN ARRAY['vtv', 'seguro', 'habilitacion_ruta']
      WHEN p_recurso_tipo = 'acoplado' THEN ARRAY['vtv', 'seguro']
      ELSE ARRAY[]::VARCHAR[]
    END) AS tipo
  ) requeridos;
  
  -- Contar documentos críticos en estado OK (validados y no vencidos)
  SELECT COUNT(*) INTO v_criticos_ok
  FROM documentos_recursos dr
  WHERE dr.recurso_tipo = p_recurso_tipo
    AND dr.recurso_id = p_recurso_id
    AND dr.es_critico = TRUE
    AND dr.estado = 'validado'
    AND (dr.fecha_vencimiento IS NULL OR dr.fecha_vencimiento > CURRENT_DATE);
  
  -- Contar documentos vencidos
  SELECT COUNT(*) INTO v_vencidos
  FROM documentos_recursos dr
  WHERE dr.recurso_tipo = p_recurso_tipo
    AND dr.recurso_id = p_recurso_id
    AND dr.estado = 'validado'
    AND dr.fecha_vencimiento IS NOT NULL
    AND dr.fecha_vencimiento < CURRENT_DATE;
  
  -- Contar documentos por vencer (próximos 30 días)
  SELECT COUNT(*) INTO v_por_vencer
  FROM documentos_recursos dr
  WHERE dr.recurso_tipo = p_recurso_tipo
    AND dr.recurso_id = p_recurso_id
    AND dr.estado = 'validado'
    AND dr.fecha_vencimiento IS NOT NULL
    AND dr.fecha_vencimiento >= CURRENT_DATE
    AND dr.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days';
  
  -- Determinar estado general
  IF v_vencidos > 0 OR v_criticos_ok < v_total_criticos THEN
    v_estado := 'bloqueado';
  ELSIF v_por_vencer > 0 THEN
    v_estado := 'advertencia';
  ELSE
    v_estado := 'ok';
  END IF;
  
  -- Construir detalles
  RETURN QUERY
  SELECT 
    v_estado,
    (v_total_criticos - v_criticos_ok)::INTEGER,
    v_vencidos::INTEGER,
    v_por_vencer::INTEGER,
    jsonb_build_object(
      'total_criticos_requeridos', v_total_criticos,
      'criticos_validados', v_criticos_ok,
      'documentos', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'tipo_documento', tipo_documento,
            'estado', estado,
            'fecha_vencimiento', fecha_vencimiento,
            'es_critico', es_critico
          )
        )
        FROM documentos_recursos
        WHERE recurso_tipo = p_recurso_tipo AND recurso_id = p_recurso_id
      )
    );
END;
$$;

COMMENT ON FUNCTION verificar_estado_documentacion_recurso IS 'Verifica el estado de documentación de un recurso (chofer/camión/acoplado). Retorna: ok, advertencia, o bloqueado';

-- =====================================================
-- PASO 3: Función para verificar documentación de viaje completo
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_documentacion_viaje(
  p_viaje_id UUID
)
RETURNS TABLE (
  estado_general VARCHAR,
  puede_operar BOOLEAN,
  problemas JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_chofer_id UUID;
  v_camion_id UUID;
  v_acoplado_id UUID;
  v_estado_chofer VARCHAR;
  v_estado_camion VARCHAR;
  v_estado_acoplado VARCHAR;
  v_puede_operar BOOLEAN := TRUE;
  v_problemas JSONB := '[]'::JSONB;
BEGIN
  -- Obtener recursos del viaje
  SELECT chofer_id, camion_id, acoplado_id 
  INTO v_chofer_id, v_camion_id, v_acoplado_id
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  -- Verificar chofer si está asignado
  IF v_chofer_id IS NOT NULL THEN
    SELECT estado_general INTO v_estado_chofer
    FROM verificar_estado_documentacion_recurso('chofer', v_chofer_id);
    
    IF v_estado_chofer = 'bloqueado' THEN
      v_puede_operar := FALSE;
      v_problemas := v_problemas || jsonb_build_object('recurso', 'chofer', 'problema', 'documentacion_bloqueada');
    ELSIF v_estado_chofer = 'advertencia' THEN
      v_problemas := v_problemas || jsonb_build_object('recurso', 'chofer', 'problema', 'documentacion_proxima_vencer');
    END IF;
  END IF;
  
  -- Verificar camión si está asignado
  IF v_camion_id IS NOT NULL THEN
    SELECT estado_general INTO v_estado_camion
    FROM verificar_estado_documentacion_recurso('camion', v_camion_id);
    
    IF v_estado_camion = 'bloqueado' THEN
      v_puede_operar := FALSE;
      v_problemas := v_problemas || jsonb_build_object('recurso', 'camion', 'problema', 'documentacion_bloqueada');
    ELSIF v_estado_camion = 'advertencia' THEN
      v_problemas := v_problemas || jsonb_build_object('recurso', 'camion', 'problema', 'documentacion_proxima_vencer');
    END IF;
  END IF;
  
  -- Verificar acoplado si está asignado
  IF v_acoplado_id IS NOT NULL THEN
    SELECT estado_general INTO v_estado_acoplado
    FROM verificar_estado_documentacion_recurso('acoplado', v_acoplado_id);
    
    IF v_estado_acoplado = 'bloqueado' THEN
      v_puede_operar := FALSE;
      v_problemas := v_problemas || jsonb_build_object('recurso', 'acoplado', 'problema', 'documentacion_bloqueada');
    ELSIF v_estado_acoplado = 'advertencia' THEN
      v_problemas := v_problemas || jsonb_build_object('recurso', 'acoplado', 'problema', 'documentacion_proxima_vencer');
    END IF;
  END IF;
  
  -- Determinar estado general
  RETURN QUERY
  SELECT 
    CASE 
      WHEN NOT v_puede_operar THEN 'bloqueado'
      WHEN jsonb_array_length(v_problemas) > 0 THEN 'advertencia'
      ELSE 'ok'
    END::VARCHAR,
    v_puede_operar,
    v_problemas;
END;
$$;

COMMENT ON FUNCTION verificar_documentacion_viaje IS 'Verifica la documentación de todos los recursos asignados a un viaje (chofer + camión + acoplado)';

-- =====================================================
-- PASO 4: RLS Policies para documentos_recursos
-- =====================================================

ALTER TABLE documentos_recursos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuarios ven documentos de recursos de su empresa
CREATE POLICY "Ver documentos de mi empresa"
  ON documentos_recursos
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = TRUE
    )
  );

-- Policy 2: Coordinador de Transporte puede insertar documentos de recursos de su empresa
CREATE POLICY "Transporte sube documentos"
  ON documentos_recursos
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador_transporte', 'administrador_transporte', 'supervisor_transporte')
    )
    AND
    -- Verificar que el recurso pertenece a la misma empresa
    (
      (recurso_tipo = 'chofer' AND recurso_id IN (
        SELECT c.id FROM choferes c WHERE c.empresa_id = documentos_recursos.empresa_id
      ))
      OR
      (recurso_tipo = 'camion' AND recurso_id IN (
        SELECT cam.id FROM camiones cam WHERE cam.empresa_id = documentos_recursos.empresa_id
      ))
      OR
      (recurso_tipo = 'acoplado' AND recurso_id IN (
        SELECT a.id FROM acoplados a WHERE a.empresa_id = documentos_recursos.empresa_id
      ))
    )
  );

-- Policy 3: Admin Nodexia (superadmin) puede validar/rechazar documentos
CREATE POLICY "Admin Nodexia valida documentos"
  ON documentos_recursos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.rol_global = 'superadmin'
    )
  );

-- Policy 4: Coordinador de Planta puede validar en caso de incidencia
CREATE POLICY "Coordinador Planta valida por incidencia"
  ON documentos_recursos
  FOR UPDATE
  USING (
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador_planta', 'supervisor_planta')
    )
  );

-- Policy 5: Solo Admin Nodexia puede eliminar documentos
CREATE POLICY "Solo admin elimina documentos"
  ON documentos_recursos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.rol_global = 'superadmin'
    )
  );

-- =====================================================
-- PASO 5: Agregar columna a viajes_despacho
-- =====================================================

-- Agregar columna para tracking de validación de documentación por Control de Acceso
ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS documentacion_recursos_verificada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS documentacion_recursos_verificada_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS documentacion_recursos_verificada_at TIMESTAMPTZ;

COMMENT ON COLUMN viajes_despacho.documentacion_recursos_verificada IS 'TRUE si Control de Acceso verificó que la documentación de recursos está OK';

-- =====================================================
-- PASO 6: Actualizar tabla incidencias_viaje
-- =====================================================

-- Verificar que exista la tabla incidencias_viaje
DO $$
BEGIN
  -- Agregar nuevos tipos de incidencia si no existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidencias_viaje') THEN
    -- Eliminar constraint anterior
    ALTER TABLE incidencias_viaje DROP CONSTRAINT IF EXISTS incidencias_viaje_tipo_incidencia_check;
    
    -- Recrear con nuevos valores
    ALTER TABLE incidencias_viaje 
    ADD CONSTRAINT incidencias_viaje_tipo_incidencia_check 
    CHECK (tipo_incidencia IN (
      'retraso',
      'averia_camion',
      'documentacion_faltante',
      'documentacion_vencida',
      'documentacion_carga_inconsistente',
      'producto_danado',
      'accidente',
      'otro'
    ));
  END IF;
END $$;

-- =====================================================
-- PASO 7: Función para crear incidencia de documentación
-- =====================================================

CREATE OR REPLACE FUNCTION crear_incidencia_documentacion(
  p_viaje_id UUID,
  p_tipo VARCHAR,
  p_descripcion TEXT,
  p_severidad VARCHAR DEFAULT 'media'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incidencia_id UUID;
BEGIN
  -- Insertar incidencia
  INSERT INTO incidencias_viaje (
    viaje_id,
    tipo_incidencia,
    severidad,
    estado,
    descripcion,
    reportado_por,
    reportado_en
  ) VALUES (
    p_viaje_id,
    p_tipo,
    p_severidad,
    'abierta',
    p_descripcion,
    auth.uid(),
    NOW()
  )
  RETURNING id INTO v_incidencia_id;
  
  RETURN v_incidencia_id;
END;
$$;

-- Permisos
REVOKE ALL ON FUNCTION crear_incidencia_documentacion FROM public, anon;
GRANT EXECUTE ON FUNCTION crear_incidencia_documentacion TO authenticated;

COMMENT ON FUNCTION crear_incidencia_documentacion IS 'Crea una incidencia de documentación desde Control de Acceso';

-- =====================================================
-- PASO 8: Trigger para actualizar fecha de vencimiento automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_estado_documentos_vencidos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si el documento tiene fecha de vencimiento y está validado
  IF NEW.fecha_vencimiento IS NOT NULL 
     AND NEW.estado = 'validado' 
     AND NEW.fecha_vencimiento < CURRENT_DATE THEN
    NEW.estado := 'vencido';
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_actualizar_estado_docs
  BEFORE UPDATE ON documentos_recursos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_documentos_vencidos();

-- =====================================================
-- PASO 9: Job diario para marcar documentos vencidos
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_documentos_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE documentos_recursos
  SET estado = 'vencido',
      updated_at = NOW()
  WHERE estado = 'validado'
    AND fecha_vencimiento IS NOT NULL
    AND fecha_vencimiento < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION marcar_documentos_vencidos IS 'Job diario para marcar documentos vencidos. Ejecutar con pg_cron o similar';

-- =====================================================
-- PASO 10: Datos de prueba (opcional, comentado por defecto)
-- =====================================================

-- Descomentar para crear datos de prueba
/*
-- Ejemplo: Documentos de un chofer
INSERT INTO documentos_recursos (
  recurso_tipo, recurso_id, tipo_documento, estado, 
  fecha_emision, fecha_vencimiento, es_critico, empresa_id
)
SELECT 
  'chofer', 
  c.id, 
  'licencia_conducir', 
  'validado',
  CURRENT_DATE - INTERVAL '1 year',
  CURRENT_DATE + INTERVAL '2 years',
  TRUE,
  c.empresa_id
FROM choferes c
LIMIT 1;
*/

-- =====================================================
-- Verificación final
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 046 completada exitosamente';
  RAISE NOTICE '📊 Tabla documentos_recursos creada';
  RAISE NOTICE '🔍 Funciones de verificación creadas';
  RAISE NOTICE '🛡️  Políticas RLS aplicadas';
  RAISE NOTICE '⚡ Triggers configurados';
END $$;

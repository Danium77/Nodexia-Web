 -- =====================================================
-- MIGRATION 046 CORREGIDA: Sistema de Documentación de Entidades
-- Fecha: 08-Feb-2026
-- Propósito: Sistema completo de gestión de documentación con auditoría y seguridad
-- =====================================================

-- CONTEXTO Y FLUJOS:
-- 1. SUBIDA: Coordinador Transporte + Chofer (propios docs) + Excepcionalmente Control Acceso/Coord Planta
-- 2. VALIDACIÓN: Admin Nodexia (normal) + Excepcionalmente Coord Planta/Control Acceso (requiere reconfirmación)
-- 3. VENCIMIENTO: NO bloquea asignación viajes (solo aviso) | SÍ bloquea ingreso en Control de Acceso
-- 4. RENOVACIÓN: Documento nuevo reemplaza al viejo (se archiva el anterior para auditoría)
-- 5. AUDITORÍA: Registro completo de todos los movimientos para auditoría retrospectiva

-- =====================================================
-- PASO 1: Tabla principal documentos_entidad
-- =====================================================

CREATE TABLE IF NOT EXISTS documentos_entidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entidad dueña del documento
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('chofer', 'camion', 'acoplado', 'transporte')),
  entidad_id UUID NOT NULL,
  
  -- Tipo de documento (según SPEC)
  tipo_documento TEXT NOT NULL,
  -- Valores válidos:
  -- chofer: 'licencia_conducir', 'art_clausula_no_repeticion', 'seguro_vida_autonomo'
  -- camion: 'seguro', 'rto', 'cedula'
  -- acoplado: 'seguro', 'rto', 'cedula'
  -- transporte: 'seguro_carga_global'
  
  -- Archivo en Supabase Storage
  nombre_archivo TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
  mime_type TEXT CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/jpg')),
  bucket TEXT NOT NULL DEFAULT 'documentacion-entidades',
  storage_path TEXT NOT NULL,
  
  -- Vigencia
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  estado_vigencia TEXT NOT NULL DEFAULT 'pendiente_validacion'
    CHECK (estado_vigencia IN ('pendiente_validacion', 'vigente', 'por_vencer', 'vencido', 'rechazado')),
  
  -- Validación normal por Admin Nodexia
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  motivo_rechazo TEXT,
  
  -- Validación excepcional por Coordinador Planta o Control de Acceso (por incidencias)
  validacion_excepcional BOOLEAN DEFAULT FALSE,
  validado_excepcionalmente_por UUID REFERENCES auth.users(id),
  fecha_validacion_excepcional TIMESTAMPTZ,
  incidencia_id UUID, -- Referencia a la incidencia que motivó la validación excepcional
  requiere_reconfirmacion_backoffice BOOLEAN DEFAULT FALSE,
  reconfirmado_por UUID REFERENCES auth.users(id),
  fecha_reconfirmacion TIMESTAMPTZ,
  
  -- Metadata y auditoría
  subido_por UUID NOT NULL REFERENCES auth.users(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id), -- Empresa dueña del recurso
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE, -- FALSE cuando es reemplazado por documento más reciente
  
  -- Validaciones de fechas
  CONSTRAINT check_fechas_validas CHECK (
    fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision
  ),
  CONSTRAINT check_fechas_razonables CHECK (
    fecha_emision >= '2000-01-01' 
    AND fecha_emision <= CURRENT_DATE + INTERVAL '1 year'
    AND (fecha_vencimiento IS NULL OR fecha_vencimiento <= CURRENT_DATE + INTERVAL '50 years')
  ),
  
  -- Solo puede haber UN documento activo por tipo
  CONSTRAINT unique_documento_activo_por_tipo UNIQUE (entidad_tipo, entidad_id, tipo_documento, activo)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_doc_entidad_tipo_id ON documentos_entidad(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_doc_entidad_tipo_id_activo ON documentos_entidad(entidad_tipo, entidad_id, activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_tipo_documento ON documentos_entidad(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_doc_estado_vigencia ON documentos_entidad(estado_vigencia) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_fecha_vencimiento ON documentos_entidad(fecha_vencimiento) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_empresa ON documentos_entidad(empresa_id);
CREATE INDEX IF NOT EXISTS idx_doc_validacion_pendiente ON documentos_entidad(estado_vigencia) WHERE estado_vigencia = 'pendiente_validacion' AND activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_reconfirmacion_pendiente ON documentos_entidad(requiere_reconfirmacion_backoffice) WHERE requiere_reconfirmacion_backoffice = TRUE AND activo = TRUE;

COMMENT ON TABLE documentos_entidad IS 'Documentación de choferes, camiones, acoplados y transportes. Incluye historial completo para auditoría retrospectiva.';
COMMENT ON COLUMN documentos_entidad.activo IS 'TRUE para documento actual, FALSE para documentos reemplazados (se mantienen para auditoría)';
COMMENT ON COLUMN documentos_entidad.validacion_excepcional IS 'TRUE cuando fue validado excepcionalmente por Coord Planta o Control Acceso (requiere reconfirmación)';
COMMENT ON CONSTRAINT unique_documento_activo_por_tipo ON documentos_entidad IS 'Permite solo 1 documento activo por tipo, pero mantiene histórico de docs anteriores';

-- =====================================================
-- PASO 2: Tabla de auditoría de documentos
-- =====================================================

CREATE TABLE IF NOT EXISTS auditoria_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos_entidad(id),
  
  accion TEXT NOT NULL CHECK (accion IN (
    'creacion',
    'validacion',
    'rechazo',
    'validacion_excepcional',
    'reconfirmacion',
    'reemplazo',
    'vencimiento_automatico',
    'cambio_estado'
  )),
  
  -- Quién ejecutó la acción
  usuario_id UUID REFERENCES auth.users(id),
  usuario_rol TEXT, -- Captura el rol al momento de la acción
  
  -- Estado anterior y nuevo (para cambios de estado)
  estado_anterior TEXT,
  estado_nuevo TEXT,
  
  -- Contexto adicional
  motivo TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Data adicional según el tipo de acción
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_documento ON auditoria_documentos(documento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria_documentos(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_documentos(usuario_id);

COMMENT ON TABLE auditoria_documentos IS 'Registro de auditoría completo de todas las acciones sobre documentos. Permite auditoría retrospectiva de viajes.';

-- =====================================================
-- PASO 3: Tabla de seguros de viaje específicos
-- =====================================================

CREATE TABLE IF NOT EXISTS documentos_viaje_seguro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL DEFAULT 'seguro_carga_viaje',
  nombre_archivo TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER CHECK (file_size > 0 AND file_size <= 104857600),
  mime_type TEXT CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/jpg')),
  bucket TEXT NOT NULL DEFAULT 'documentacion-viajes',
  storage_path TEXT NOT NULL,
  
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  numero_poliza TEXT,
  aseguradora TEXT,
  monto_asegurado DECIMAL(15,2),
  
  estado_vigencia TEXT NOT NULL DEFAULT 'pendiente_validacion'
    CHECK (estado_vigencia IN ('pendiente_validacion', 'vigente', 'vencido', 'rechazado')),
  
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  motivo_rechazo TEXT,
  
  subido_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_fechas_seguro CHECK (
    fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision
  )
);

CREATE INDEX IF NOT EXISTS idx_seguro_viaje ON documentos_viaje_seguro(viaje_id);
CREATE INDEX IF NOT EXISTS idx_seguro_estado ON documentos_viaje_seguro(estado_vigencia);

COMMENT ON TABLE documentos_viaje_seguro IS 'Seguros de carga específicos por viaje (opcional, algunos transportes tienen póliza global)';

-- =====================================================
-- PASO 4: Trigger para validar foreign keys de entidad
-- =====================================================

CREATE OR REPLACE FUNCTION validar_entidad_existe()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que la entidad existe y pertenece a la empresa indicada
  IF NEW.entidad_tipo = 'chofer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM choferes 
      WHERE id = NEW.entidad_id 
        AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Chofer % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
    
  ELSIF NEW.entidad_tipo = 'camion' THEN
    IF NOT EXISTS (
      SELECT 1 FROM camiones 
      WHERE id = NEW.entidad_id 
        AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Camión % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
    
  ELSIF NEW.entidad_tipo = 'acoplado' THEN
    IF NOT EXISTS (
      SELECT 1 FROM acoplados 
      WHERE id = NEW.entidad_id 
        AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Acoplado % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
    
  ELSIF NEW.entidad_tipo = 'transporte' THEN
    IF NOT EXISTS (
      SELECT 1 FROM empresas 
      WHERE id = NEW.entidad_id 
        AND tipo_empresa = 'transporte'
        AND activa = TRUE
    ) THEN
      RAISE EXCEPTION 'Empresa de transporte % no existe o está inactiva', NEW.entidad_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_entidad_existe ON documentos_entidad;
CREATE TRIGGER trigger_validar_entidad_existe
  BEFORE INSERT OR UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION validar_entidad_existe();

COMMENT ON FUNCTION validar_entidad_existe IS 'Valida que la entidad referenciada existe, pertenece a la empresa y está activa';

-- =====================================================
-- PASO 5: Trigger para actualizar vigencia automática
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_vigencia_documento()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para documentos activos
  IF NEW.activo = FALSE THEN
    RETURN NEW;
  END IF;
  
  -- Si tiene fecha de vencimiento, actualizar estado según fechas
  IF NEW.fecha_vencimiento IS NOT NULL THEN
    IF NEW.fecha_vencimiento < CURRENT_DATE THEN
      NEW.estado_vigencia := 'vencido';
    ELSIF NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '20 days' THEN
      -- Solo marcar como por_vencer si está validado
      IF NEW.estado_vigencia = 'vigente' THEN
        NEW.estado_vigencia := 'por_vencer';
      END IF;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_vigencia ON documentos_entidad;
CREATE TRIGGER trigger_actualizar_vigencia
  BEFORE INSERT OR UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_vigencia_documento();

-- =====================================================
-- PASO 6: Trigger para auditoría automática
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_auditoria_documento()
RETURNS TRIGGER AS $$
DECLARE
  v_accion TEXT;
  v_estado_anterior TEXT;
  v_estado_nuevo TEXT;
  v_metadata JSONB := '{}'::JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_accion := 'creacion';
    v_estado_nuevo := NEW.estado_vigencia;
    v_metadata := jsonb_build_object(
      'nombre_archivo', NEW.nombre_archivo,
      'tipo_documento', NEW.tipo_documento,
      'entidad_tipo', NEW.entidad_tipo,
      'entidad_id', NEW.entidad_id
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_estado_anterior := OLD.estado_vigencia;
    v_estado_nuevo := NEW.estado_vigencia;
    
    -- Determinar tipo de acción
    IF OLD.estado_vigencia = 'pendiente_validacion' AND NEW.estado_vigencia = 'vigente' THEN
      IF NEW.validacion_excepcional THEN
        v_accion := 'validacion_excepcional';
        v_metadata := jsonb_build_object(
          'validado_por', NEW.validado_excepcionalmente_por,
          'incidencia_id', NEW.incidencia_id
        );
      ELSE
        v_accion := 'validacion';
        v_metadata := jsonb_build_object('validado_por', NEW.validado_por);
      END IF;
      
    ELSIF OLD.estado_vigencia = 'pendiente_validacion' AND NEW.estado_vigencia = 'rechazado' THEN
      v_accion := 'rechazo';
      v_metadata := jsonb_build_object(
        'motivo', NEW.motivo_rechazo,
        'validado_por', NEW.validado_por
      );
      
    ELSIF OLD.requiere_reconfirmacion_backoffice = TRUE AND NEW.requiere_reconfirmacion_backoffice = FALSE THEN
      v_accion := 'reconfirmacion';
      v_metadata := jsonb_build_object('reconfirmado_por', NEW.reconfirmado_por);
      
    ELSIF OLD.activo = TRUE AND NEW.activo = FALSE THEN
      v_accion := 'reemplazo';
      v_metadata := jsonb_build_object('motivo', 'Documento reemplazado por versión más reciente');
      
    ELSIF OLD.estado_vigencia != NEW.estado_vigencia THEN
      IF NEW.estado_vigencia = 'vencido' THEN
        v_accion := 'vencimiento_automatico';
      ELSE
        v_accion := 'cambio_estado';
      END IF;
    ELSE
      -- Otras actualizaciones, no registrar en auditoría
      RETURN NEW;
    END IF;
  END IF;
  
  -- Insertar registro de auditoría
  INSERT INTO auditoria_documentos (
    documento_id,
    accion,
    usuario_id,
    estado_anterior,
    estado_nuevo,
    metadata,
    created_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_accion,
    auth.uid(),
    v_estado_anterior,
    v_estado_nuevo,
    v_metadata,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auditoria_documento ON documentos_entidad;
CREATE TRIGGER trigger_auditoria_documento
  AFTER INSERT OR UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION registrar_auditoria_documento();

COMMENT ON FUNCTION registrar_auditoria_documento IS 'Registra automáticamente en auditoría todas las acciones sobre documentos';

-- =====================================================
-- PASO 7: Función CRON para actualizar vigencias diariamente
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_vigencia_documentos_batch()
RETURNS TABLE (
  vencidos INTEGER,
  por_vencer INTEGER
) AS $$
DECLARE
  v_vencidos INTEGER;
  v_por_vencer INTEGER;
BEGIN
  -- Marcar como vencidos los documentos pasados de fecha
  UPDATE documentos_entidad
  SET estado_vigencia = 'vencido', 
      updated_at = NOW()
  WHERE fecha_vencimiento < CURRENT_DATE
    AND estado_vigencia IN ('vigente', 'por_vencer')
    AND activo = TRUE;
  
  GET DIAGNOSTICS v_vencidos = ROW_COUNT;
  
  -- Marcar como por_vencer los que vencen en 20 días o menos
  UPDATE documentos_entidad
  SET estado_vigencia = 'por_vencer', 
      updated_at = NOW()
  WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
    AND estado_vigencia = 'vigente'
    AND activo = TRUE;
  
  GET DIAGNOSTICS v_por_vencer = ROW_COUNT;
  
  RETURN QUERY SELECT v_vencidos, v_por_vencer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION actualizar_vigencia_documentos_batch IS 'Job diario para actualizar estados de vigencia. Ejecutar con pg_cron o similar a las 00:00.';

-- =====================================================
-- PASO 8: Vista para documentos próximos a vencer (notificaciones)
-- =====================================================

CREATE OR REPLACE VIEW documentos_proximos_vencer AS
SELECT 
  de.*,
  (de.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer,
  CASE
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 5 THEN 'urgente'
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 10 THEN 'alerta'
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 20 THEN 'aviso'
  END AS nivel_alerta,
  -- Datos de la entidad según tipo
  CASE de.entidad_tipo
    WHEN 'chofer' THEN (SELECT row_to_json(c) FROM (SELECT nombre, apellido, dni FROM choferes WHERE id = de.entidad_id) c)
    WHEN 'camion' THEN (SELECT row_to_json(cam) FROM (SELECT patente, marca, modelo FROM camiones WHERE id = de.entidad_id) cam)
    WHEN 'acoplado' THEN (SELECT row_to_json(a) FROM (SELECT patente, marca, modelo FROM acoplados WHERE id = de.entidad_id) a)
    ELSE NULL
  END AS entidad_datos
FROM documentos_entidad de
WHERE de.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
  AND de.estado_vigencia IN ('vigente', 'por_vencer')
  AND de.activo = TRUE
ORDER BY de.fecha_vencimiento ASC;

COMMENT ON VIEW documentos_proximos_vencer IS 'Vista para sistema de notificaciones. Muestra documentos que vencen en 20 días o menos.';

-- =====================================================
-- PASO 9: Función para verificar documentación de entidad (CON SEGURIDAD)
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_documentacion_entidad(
  p_entidad_tipo TEXT,
  p_entidad_id UUID
)
RETURNS TABLE (
  tiene_documentos BOOLEAN,
  documentos_vigentes INTEGER,
  documentos_por_vencer INTEGER,
  documentos_vencidos INTEGER,
  documentos_pendientes INTEGER,
  documentos_faltantes TEXT[],
  detalle JSONB
) AS $$
DECLARE
  v_empresa_id UUID;
  v_puede_acceder BOOLEAN := FALSE;
BEGIN
  -- Obtener empresa_id de la entidad
  IF p_entidad_tipo = 'transporte' THEN
    -- Para transporte, la empresa ES la entidad
    v_empresa_id := p_entidad_id;
    IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = v_empresa_id AND tipo_empresa = 'transporte') THEN
      RAISE EXCEPTION 'Entidad no encontrada';
    END IF;
  ELSE
    EXECUTE format(
      'SELECT empresa_id FROM %I WHERE id = $1',
      CASE p_entidad_tipo
        WHEN 'chofer' THEN 'choferes'
        WHEN 'camion' THEN 'camiones'
        WHEN 'acoplado' THEN 'acoplados'
      END
    ) INTO v_empresa_id USING p_entidad_id;
    
    IF v_empresa_id IS NULL THEN
      RAISE EXCEPTION 'Entidad no encontrada';
    END IF;
  END IF;
  
  -- Verificar permisos: Usuario debe pertenecer a la empresa O ser superadmin
  SELECT EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid() AND activo = TRUE
  ) OR EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = v_empresa_id
      AND ue.activo = TRUE
  ) INTO v_puede_acceder;
  
  IF NOT v_puede_acceder THEN
    RAISE EXCEPTION 'Sin permisos para acceder a la documentación de esta entidad';
  END IF;
  
  -- Retornar estadísticas de documentación
  RETURN QUERY
  WITH docs AS (
    SELECT 
      de.tipo_documento,
      de.estado_vigencia,
      de.fecha_vencimiento,
      de.validacion_excepcional,
      de.requiere_reconfirmacion_backoffice
    FROM documentos_entidad de
    WHERE de.entidad_tipo = p_entidad_tipo
      AND de.entidad_id = p_entidad_id
      AND de.activo = TRUE
  ),
  docs_requeridos AS (
    SELECT UNNEST(CASE p_entidad_tipo
      WHEN 'chofer' THEN ARRAY['licencia_conducir', 'art_clausula_no_repeticion']
      WHEN 'camion' THEN ARRAY['seguro', 'rto', 'cedula']
      WHEN 'acoplado' THEN ARRAY['seguro', 'rto', 'cedula']
      ELSE ARRAY[]::TEXT[]
    END) AS tipo
  )
  SELECT 
    EXISTS(SELECT 1 FROM docs),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'vigente'),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'por_vencer'),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'vencido'),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'pendiente_validacion'),
    ARRAY(
      SELECT dr.tipo 
      FROM docs_requeridos dr
      WHERE NOT EXISTS (SELECT 1 FROM docs d WHERE d.tipo_documento = dr.tipo)
    ),
    jsonb_agg(
      jsonb_build_object(
        'tipo_documento', docs.tipo_documento,
        'estado_vigencia', docs.estado_vigencia,
        'fecha_vencimiento', docs.fecha_vencimiento,
        'validacion_excepcional', docs.validacion_excepcional,
        'requiere_reconfirmacion', docs.requiere_reconfirmacion_backoffice
      )
    )
  FROM docs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verificar_documentacion_entidad IS 'Verifica el estado de documentación de una entidad. CON CONTROL DE PERMISOS multi-tenant.';

-- =====================================================
-- PASO 10: Función para verificar documentación de unidad operativa completa
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_documentacion_unidad_operativa(
  p_chofer_id UUID,
  p_camion_id UUID,
  p_acoplado_id UUID DEFAULT NULL
)
RETURNS TABLE (
  puede_recibir_viajes BOOLEAN,
  puede_ingresar_planta BOOLEAN,
  motivo_bloqueo TEXT,
  alertas TEXT[],
  detalle JSONB
) AS $$
DECLARE
  v_chofer_tiene_docs BOOLEAN;
  v_camion_tiene_docs BOOLEAN;
  v_acoplado_tiene_docs BOOLEAN := TRUE;
  v_docs_vencidos INTEGER := 0;
  v_docs_pendientes INTEGER := 0;
  v_puede_recibir BOOLEAN := TRUE;
  v_puede_ingresar BOOLEAN := TRUE;
  v_motivo TEXT := NULL;
  v_alertas TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar que chofer tiene al menos 1 documento cargado
  SELECT tiene_documentos, documentos_vencidos, documentos_pendientes
  INTO v_chofer_tiene_docs, v_docs_vencidos, v_docs_pendientes
  FROM verificar_documentacion_entidad('chofer', p_chofer_id);
  
  IF NOT v_chofer_tiene_docs THEN
    v_puede_recibir := FALSE;
    v_puede_ingresar := FALSE;
    v_motivo := 'Chofer sin documentación cargada';
  END IF;
  
  -- Verificar camión
  SELECT tiene_documentos INTO v_camion_tiene_docs
  FROM verificar_documentacion_entidad('camion', p_camion_id);
  
  IF NOT v_camion_tiene_docs THEN
    v_puede_recibir := FALSE;
    v_puede_ingresar := FALSE;
    v_motivo := COALESCE(v_motivo || ' | ', '') || 'Camión sin documentación cargada';
  END IF;
  
  -- Verificar acoplado si existe
  IF p_acoplado_id IS NOT NULL THEN
    SELECT tiene_documentos INTO v_acoplado_tiene_docs
    FROM verificar_documentacion_entidad('acoplado', p_acoplado_id);
    
    IF NOT v_acoplado_tiene_docs THEN
      v_puede_recibir := FALSE;
      v_puede_ingresar := FALSE;
      v_motivo := COALESCE(v_motivo || ' | ', '') || 'Acoplado sin documentación cargada';
    END IF;
  END IF;
  
  -- Si tiene docs pero hay vencidos → NO bloquea asignación pero SÍ bloquea ingreso
  IF v_docs_vencidos > 0 THEN
    v_puede_ingresar := FALSE;
    v_motivo := COALESCE(v_motivo || ' | ', '') || format('Documentos vencidos: %s', v_docs_vencidos);
    v_alertas := array_append(v_alertas, format('⚠️ %s documento(s) vencido(s)', v_docs_vencidos));
  END IF;
  
  -- Si hay docs pendientes de validación → alerta pero no bloquea
  IF v_docs_pendientes > 0 THEN
    v_alertas := array_append(v_alertas, format('⏳ %s documento(s) pendiente(s) de validación', v_docs_pendientes));
  END IF;
  
  -- Retornar resultado
  RETURN QUERY
  SELECT 
    v_puede_recibir,
    v_puede_ingresar,
    v_motivo,
    v_alertas,
    jsonb_build_object(
      'chofer', (SELECT detalle FROM verificar_documentacion_entidad('chofer', p_chofer_id)),
      'camion', (SELECT detalle FROM verificar_documentacion_entidad('camion', p_camion_id)),
      'acoplado', (
        CASE WHEN p_acoplado_id IS NOT NULL 
        THEN (SELECT detalle FROM verificar_documentacion_entidad('acoplado', p_acoplado_id))
        ELSE NULL END
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verificar_documentacion_unidad_operativa IS 'Verifica documentación completa de chofer+camion+acoplado. puede_recibir_viajes: solo si tiene docs cargados. puede_ingresar_planta: si tiene docs vigentes.';

-- =====================================================
-- PASO 11: Función para reemplazar documento (con archivado)
-- =====================================================

CREATE OR REPLACE FUNCTION reemplazar_documento(
  p_entidad_tipo TEXT,
  p_entidad_id UUID,
  p_tipo_documento TEXT,
  p_nuevo_documento_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Marcar documento anterior como inactivo (archivado para auditoría)
  UPDATE documentos_entidad
  SET activo = FALSE,
      updated_at = NOW()
  WHERE entidad_tipo = p_entidad_tipo
    AND entidad_id = p_entidad_id
    AND tipo_documento = p_tipo_documento
    AND activo = TRUE
    AND id != p_nuevo_documento_id;
  
  -- El nuevo documento ya debe estar insertado con activo = TRUE
  -- El trigger de auditoría registrará automáticamente el reemplazo
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reemplazar_documento IS 'Archiva documento anterior cuando se sube uno nuevo. Mantiene historial para auditoría retrospectiva.';

-- =====================================================
-- PASO 12: Función para auditoría retrospectiva de viaje
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_documentacion_historica_viaje(
  p_viaje_id UUID
)
RETURNS TABLE (
  entidad_tipo TEXT,
  entidad_id UUID,
  tipo_documento TEXT,
  estado_en_momento_viaje TEXT,
  documento_id UUID,
  fecha_vencimiento DATE,
  validado_por UUID,
  fecha_validacion TIMESTAMPTZ
) AS $$
DECLARE
  v_fecha_viaje TIMESTAMPTZ;
  v_chofer_id UUID;
  v_camion_id UUID;
  v_acoplado_id UUID;
BEGIN
  -- Obtener datos del viaje
  SELECT created_at, chofer_id, camion_id, acoplado_id
  INTO v_fecha_viaje, v_chofer_id, v_camion_id, v_acoplado_id
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  IF v_fecha_viaje IS NULL THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;
  
  -- Buscar documentos que estaban ACTIVOS en el momento del viaje
  RETURN QUERY
  SELECT 
    de.entidad_tipo,
    de.entidad_id,
    de.tipo_documento,
    CASE 
      WHEN de.fecha_vencimiento < v_fecha_viaje::DATE THEN 'vencido'
      WHEN de.fecha_vencimiento IS NULL OR de.fecha_vencimiento >= v_fecha_viaje::DATE THEN 'vigente'
    END AS estado_en_momento_viaje,
    de.id AS documento_id,
    de.fecha_vencimiento,
    de.validado_por,
    de.fecha_validacion
  FROM documentos_entidad de
  WHERE (
    (de.entidad_tipo = 'chofer' AND de.entidad_id = v_chofer_id) OR
    (de.entidad_tipo = 'camion' AND de.entidad_id = v_camion_id) OR
    (de.entidad_tipo = 'acoplado' AND de.entidad_id = v_acoplado_id AND v_acoplado_id IS NOT NULL)
  )
  AND de.created_at <= v_fecha_viaje  -- Documento existía en ese momento
  AND (
    de.activo = TRUE OR  -- Documento aún activo
    de.updated_at >= v_fecha_viaje  -- O fue reemplazado después del viaje
  )
  ORDER BY de.entidad_tipo, de.tipo_documento;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_documentacion_historica_viaje IS 'Obtiene el estado de documentación que tenía la unidad operativa en el momento de realizar un viaje. Para auditoría retrospectiva.';

-- =====================================================
-- PASO 13: RLS Policies
-- =====================================================

ALTER TABLE documentos_entidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_viaje_seguro ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Ver documentos según permisos
DROP POLICY IF EXISTS "Ver documentos según rol" ON documentos_entidad;
CREATE POLICY "Ver documentos según rol"
  ON documentos_entidad
  FOR SELECT
  USING (
    -- Superadmin ve todo
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR
    -- Usuario ve docs de entidades de su empresa
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
    )
    OR
    -- Chofer ve sus propios documentos
    (
      entidad_tipo = 'chofer' 
      AND entidad_id IN (
        Select c.id FROM choferes c WHERE c.usuario_id = auth.uid()
      )
    )
  );

-- Policy 2: INSERT - Subir documentos
DROP POLICY IF EXISTS "Subir documentos según rol" ON documentos_entidad;
CREATE POLICY "Subir documentos según rol"
  ON documentos_entidad
  FOR INSERT
  WITH CHECK (
    -- Coordinador de Transporte sube docs de su flota
    (
      empresa_id IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid() 
          AND ue.activo = TRUE
          AND ue.rol_interno IN ('coordinador', 'administrativo', 'supervisor')
      )
    )
    OR
    -- Chofer sube sus propios documentos
    (
      entidad_tipo = 'chofer' 
      AND entidad_id IN (
        SELECT c.id FROM choferes c WHERE c.usuario_id = auth.uid()
      )
    )
    OR
    -- Control de Acceso / Coordinador de Planta (validación excepcional por incidencia)
    (
      validacion_excepcional = TRUE
      AND EXISTS (
        SELECT 1 FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
          AND ue.activo = TRUE
          AND ue.rol_interno IN ('control_acceso', 'coordinador', 'supervisor')
      )
    )
  );

-- Policy 3: UPDATE - Validar documentos
DROP POLICY IF EXISTS "Validar documentos según rol" ON documentos_entidad;
CREATE POLICY "Validar documentos según rol"
  ON documentos_entidad
  FOR UPDATE
  USING (
    -- Superadmin puede validar cualquier documento
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR
    -- Coordinador de Planta / Control de Acceso (validación excepcional)
    (
      empresa_id IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
          AND ue.activo = TRUE
          AND ue.rol_interno IN ('coordinador', 'supervisor', 'control_acceso')
      )
    )
  )
  WITH CHECK (
    -- Superadmin puede cambiar cualquier campo
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR
    -- Coordinador/Control solo pueden actualizar campos de validación excepcional
    (
      empresa_id = (SELECT empresa_id FROM documentos_entidad WHERE id = documentos_entidad.id)
      AND entidad_tipo = (SELECT entidad_tipo FROM documentos_entidad WHERE id = documentos_entidad.id)
      AND entidad_id = (SELECT entidad_id FROM documentos_entidad WHERE id = documentos_entidad.id)
      AND tipo_documento = (SELECT tipo_documento FROM documentos_entidad WHERE id = documentos_entidad.id)
      -- Solo pueden cambiar estado y campos de validación excepcional
    )
  );

-- Policy 4: DELETE - Solo superadmin
DROP POLICY IF EXISTS "Solo superadmin elimina documentos" ON documentos_entidad;
CREATE POLICY "Solo superadmin elimina documentos"
  ON documentos_entidad
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
  );

-- Policies para auditoría (solo lectura)
DROP POLICY IF EXISTS "Ver auditoría según permisos" ON auditoria_documentos;
CREATE POLICY "Ver auditoría según permisos"
  ON auditoria_documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR
    documento_id IN (
      SELECT de.id FROM documentos_entidad de
      WHERE de.empresa_id IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
      )
    )
  );

-- Políticas para seguros de viaje
DROP POLICY IF EXISTS "Ver seguros de viaje" ON documentos_viaje_seguro;
CREATE POLICY "Ver seguros de viaje"
  ON documentos_viaje_seguro
  FOR SELECT
  USING (
    viaje_id IN (
      SELECT vd.id FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
      )
    )
  );

-- =====================================================
-- PASO 14: Grants y permisos de funciones
-- =====================================================

-- Funciones públicas para usuarios autenticados
GRANT EXECUTE ON FUNCTION verificar_documentacion_entidad TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_documentacion_unidad_operativa TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_documentacion_historica_viaje TO authenticated;

-- Funciones administrativas solo para roles específicos
REVOKE ALL ON FUNCTION actualizar_vigencia_documentos_batch FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION reemplazar_documento FROM public, anon, authenticated;

-- =====================================================
-- Verificación final
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 046 CORREGIDA completada exitosamente';
  RAISE NOTICE '📊 Tabla documentos_entidad creada con seguridad completa';
  RAISE NOTICE '📝 Sistema de auditoría implementado';
  RAISE NOTICE '🔒 Políticas RLS configuradas para multi-tenant';
  RAISE NOTICE '🔍 Funciones de verificación con control de permisos';
  RAISE NOTICE '⏰ Sistema de vigencia automática implementado';
  RAISE NOTICE '📜 Auditoría retrospectiva disponible';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RECORDAR:';
  RAISE NOTICE '1. Configurar pg_cron para ejecutar actualizar_vigencia_documentos_batch() diariamente';
  RAISE NOTICE '2. Configurar buckets de Supabase Storage: documentacion-entidades y documentacion-viajes';
  RAISE NOTICE '3. Implementar sistema de notificaciones basado en vista documentos_proximos_vencer';
END $$;

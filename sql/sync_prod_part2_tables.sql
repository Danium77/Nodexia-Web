-- ============================================================================
-- SYNC PRODUCCIÓN - PARTE 2: Tablas nuevas
-- ============================================================================
-- Ejecutar en: https://supabase.com/dashboard/project/lkdcofsfjnltuzzzwoir/sql/new
-- DESPUÉS de ejecutar Parte 1
-- ============================================================================

-- === 1. UNIDADES_OPERATIVAS (migración 017) ===
CREATE TABLE IF NOT EXISTS unidades_operativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20),
  chofer_id UUID NOT NULL REFERENCES choferes(id) ON DELETE RESTRICT,
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE RESTRICT,
  acoplado_id UUID REFERENCES acoplados(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  ultima_hora_inicio_jornada TIMESTAMPTZ,
  ultima_hora_fin_jornada TIMESTAMPTZ,
  horas_conducidas_hoy DECIMAL(4,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unidades_operativas_nombre_empresa_unique UNIQUE (empresa_id, nombre)
);

-- === 2. TRACKING_GPS (migración 024) ===
CREATE TABLE IF NOT EXISTS tracking_gps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chofer_id UUID NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  velocidad DECIMAL(5, 2),
  rumbo INTEGER,
  precision_metros INTEGER,
  bateria_porcentaje INTEGER,
  app_version VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT velocidad_valida CHECK (velocidad >= 0 AND velocidad <= 200),
  CONSTRAINT rumbo_valido CHECK (rumbo >= 0 AND rumbo <= 360),
  CONSTRAINT bateria_valida CHECK (bateria_porcentaje >= 0 AND bateria_porcentaje <= 100)
);

-- === 3. HISTORIAL_UNIDADES_OPERATIVAS (migración 025) ===
CREATE TABLE IF NOT EXISTS historial_unidades_operativas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unidad_operativa_id UUID NOT NULL REFERENCES unidades_operativas(id) ON DELETE CASCADE,
  tipo_cambio VARCHAR(20) NOT NULL CHECK (tipo_cambio IN ('chofer', 'camion', 'acoplado', 'activo', 'nombre')),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  modificado_por UUID REFERENCES auth.users(id),
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === 4. CANCELACIONES_DESPACHOS (migración 028) ===
CREATE TABLE IF NOT EXISTS cancelaciones_despachos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despacho_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cancelado_por_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pedido_id VARCHAR(50) NOT NULL,
  cliente_nombre VARCHAR(255),
  origen_nombre VARCHAR(255),
  destino_nombre VARCHAR(255),
  scheduled_date DATE,
  scheduled_time TIME,
  estado_al_cancelar VARCHAR(50),
  motivo_cancelacion TEXT NOT NULL,
  motivo_categoria VARCHAR(50),
  tenia_chofer_asignado BOOLEAN DEFAULT FALSE,
  tenia_camion_asignado BOOLEAN DEFAULT FALSE,
  tenia_acoplado_asignado BOOLEAN DEFAULT FALSE,
  fue_reprogramado_previamente BOOLEAN DEFAULT FALSE,
  cantidad_reprogramaciones_previas INT DEFAULT 0,
  afecta_calificacion_planta BOOLEAN DEFAULT FALSE,
  afecta_calificacion_transporte BOOLEAN DEFAULT FALSE,
  calificacion_impacto DECIMAL(2,1),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === 5. DOCUMENTOS_RECURSOS (migración 046 activa) ===
CREATE TABLE IF NOT EXISTS documentos_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_tipo VARCHAR(20) NOT NULL CHECK (recurso_tipo IN ('chofer', 'camion', 'acoplado')),
  recurso_id UUID NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN (
    'licencia_conducir', 'carnet_psicofisico', 'curso_mercancia_peligrosa',
    'habilitacion_senasa', 'certificado_antecedentes',
    'vtv', 'seguro', 'habilitacion_ruta', 'rto', 'tarjeta_verde', 'certificado_gnc',
    'otro'
  )),
  nombre_archivo VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'validado', 'rechazado', 'vencido')),
  fecha_emision DATE,
  fecha_vencimiento DATE,
  validado_por UUID REFERENCES auth.users(id),
  validado_at TIMESTAMPTZ,
  motivo_rechazo TEXT,
  es_critico BOOLEAN DEFAULT TRUE,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurso_tipo, recurso_id, tipo_documento)
);

-- === 6. HISTORIAL_DESPACHOS (migración 055) ===
CREATE TABLE IF NOT EXISTS historial_despachos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID REFERENCES despachos(id) ON DELETE CASCADE,
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  accion VARCHAR(100) NOT NULL,
  descripcion TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES empresas(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === 7. PARADAS (migración 058) ===
CREATE TABLE IF NOT EXISTS paradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL CHECK (orden >= 1 AND orden <= 4),
  tipo TEXT NOT NULL CHECK (tipo IN ('origen', 'destino')),
  planta_id UUID,
  planta_nombre TEXT,
  tiene_nodexia BOOLEAN NOT NULL DEFAULT true,
  estado_parada TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_parada IN ('pendiente', 'en_transito', 'ingresado', 'llamado', 'en_proceso', 'completado', 'egresado')),
  hora_ingreso TIMESTAMPTZ,
  hora_egreso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (viaje_id, orden)
);

-- === 8. AUDITORIA_ESTADOS (de archive/029) ===
CREATE TABLE IF NOT EXISTS auditoria_estados (
  id BIGSERIAL PRIMARY KEY,
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  rol_usuario VARCHAR(50),
  motivo TEXT,
  ubicacion_latitud DECIMAL(10, 8),
  ubicacion_longitud DECIMAL(11, 8),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === 9. DOCUMENTOS_ENTIDAD (de archive/046_CORREGIDO) ===
CREATE TABLE IF NOT EXISTS documentos_entidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('chofer', 'camion', 'acoplado', 'transporte')),
  entidad_id UUID NOT NULL,
  tipo_documento TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type TEXT CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/jpg')),
  bucket TEXT NOT NULL DEFAULT 'documentacion-entidades',
  storage_path TEXT NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  estado_vigencia TEXT NOT NULL DEFAULT 'pendiente_validacion'
    CHECK (estado_vigencia IN ('pendiente_validacion', 'vigente', 'por_vencer', 'vencido', 'rechazado')),
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  motivo_rechazo TEXT,
  validacion_excepcional BOOLEAN DEFAULT FALSE,
  validado_excepcionalmente_por UUID REFERENCES auth.users(id),
  fecha_validacion_excepcional TIMESTAMPTZ,
  incidencia_id UUID,
  requiere_reconfirmacion_backoffice BOOLEAN DEFAULT FALSE,
  reconfirmado_por UUID REFERENCES auth.users(id),
  fecha_reconfirmacion TIMESTAMPTZ,
  subido_por UUID NOT NULL REFERENCES auth.users(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE,
  CONSTRAINT check_fechas_validas CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision),
  CONSTRAINT check_fechas_razonables CHECK (
    fecha_emision >= '2000-01-01' AND fecha_emision <= CURRENT_DATE + INTERVAL '1 year'
    AND (fecha_vencimiento IS NULL OR fecha_vencimiento <= CURRENT_DATE + INTERVAL '50 years')
  ),
  CONSTRAINT unique_documento_activo_por_tipo UNIQUE (entidad_tipo, entidad_id, tipo_documento, activo)
);

-- === 10. AUDITORIA_DOCUMENTOS (de archive/046_CORREGIDO) ===
CREATE TABLE IF NOT EXISTS auditoria_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos_entidad(id),
  accion TEXT NOT NULL CHECK (accion IN (
    'creacion', 'validacion', 'rechazo', 'validacion_excepcional',
    'reconfirmacion', 'reemplazo', 'vencimiento_automatico', 'cambio_estado'
  )),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_rol TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  motivo TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === 11. DOCUMENTOS_VIAJE_SEGURO (de archive/046_CORREGIDO) ===
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
  CONSTRAINT check_fechas_seguro CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision)
);

-- === VERIFICACIÓN ===
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  RAISE NOTICE 'PARTE 2 COMPLETADA: Total tablas en public: %', v_count;
END $$;

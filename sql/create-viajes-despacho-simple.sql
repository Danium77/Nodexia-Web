-- =====================================================
-- SISTEMA DE VIAJES - VERSIÓN SIMPLIFICADA SIN TRIGGERS
-- =====================================================
-- Ejecutar este SQL primero para crear las tablas básicas
-- Los triggers los agregamos después cuando sepamos la estructura exacta
-- =====================================================

-- PASO 1: Agregar campos a despachos
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS cantidad_viajes_solicitados INTEGER DEFAULT 1 CHECK (cantidad_viajes_solicitados > 0),
ADD COLUMN IF NOT EXISTS cantidad_viajes_asignados INTEGER DEFAULT 0 CHECK (cantidad_viajes_asignados >= 0),
ADD COLUMN IF NOT EXISTS cantidad_viajes_completados INTEGER DEFAULT 0 CHECK (cantidad_viajes_completados >= 0);

-- PASO 2: Crear tabla viajes_despacho
CREATE TABLE IF NOT EXISTS viajes_despacho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
  numero_viaje INTEGER NOT NULL,
  id_transporte UUID, -- Empresa de transporte asignada (sin FK por ahora)
  id_camion UUID REFERENCES camiones(id) ON DELETE SET NULL,
  id_acoplado UUID REFERENCES acoplados(id) ON DELETE SET NULL,
  id_chofer UUID REFERENCES choferes(id) ON DELETE SET NULL,
  
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado',
    'en_transito', 'en_planta', 'esperando_carga', 'cargando',
    'carga_completa', 'en_ruta', 'entregado', 'completado',
    'cancelado', 'incidencia'
  )),
  
  -- Tracking temporal
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_asignacion_transporte TIMESTAMPTZ,
  fecha_asignacion_camion TIMESTAMPTZ,
  fecha_confirmacion_chofer TIMESTAMPTZ,
  fecha_ingreso_planta TIMESTAMPTZ,
  fecha_llamado_carga TIMESTAMPTZ,
  fecha_inicio_carga TIMESTAMPTZ,
  fecha_fin_carga TIMESTAMPTZ,
  fecha_salida_planta TIMESTAMPTZ,
  fecha_llegada_destino TIMESTAMPTZ,
  fecha_confirmacion_entrega TIMESTAMPTZ,
  
  -- Datos de carga
  producto TEXT,
  peso_estimado DECIMAL(10,2),
  peso_real DECIMAL(10,2),
  unidad_medida TEXT DEFAULT 'kg',
  
  -- Documentación
  remito_numero TEXT,
  remito_url TEXT,
  carta_porte_url TEXT,
  fotos_carga JSONB,
  documentacion_completa BOOLEAN DEFAULT FALSE,
  
  -- Observaciones
  observaciones TEXT,
  notas_internas TEXT,
  
  -- Usuarios responsables
  asignado_por UUID REFERENCES auth.users(id),
  camion_asignado_por UUID REFERENCES auth.users(id),
  confirmado_por UUID REFERENCES auth.users(id),
  ingreso_registrado_por UUID REFERENCES auth.users(id),
  carga_supervisada_por UUID REFERENCES auth.users(id),
  salida_registrada_por UUID REFERENCES auth.users(id),
  entrega_confirmada_por UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_despacho_numero_viaje UNIQUE (despacho_id, numero_viaje)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_despacho_id ON viajes_despacho(despacho_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_transport_id ON viajes_despacho(id_transporte);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_camion_id ON viajes_despacho(id_camion);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_chofer_id ON viajes_despacho(id_chofer);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_estado ON viajes_despacho(estado);

-- PASO 3: Crear tabla registro_control_acceso
CREATE TABLE IF NOT EXISTS registro_control_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  id_camion UUID REFERENCES camiones(id),
  id_acoplado UUID REFERENCES acoplados(id),
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
  fecha_hora TIMESTAMPTZ DEFAULT NOW(),
  patente_camion TEXT,
  patente_acoplado TEXT,
  registrado_por UUID NOT NULL REFERENCES auth.users(id),
  observaciones TEXT,
  foto_camion_url TEXT,
  foto_acoplado_url TEXT,
  temperatura_producto DECIMAL(5,2),
  documentacion_ok BOOLEAN DEFAULT TRUE,
  documentacion_observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registro_control_viaje_id ON registro_control_acceso(viaje_id);
CREATE INDEX IF NOT EXISTS idx_registro_control_camion_id ON registro_control_acceso(id_camion);

-- PASO 4: Crear tabla incidencias_viaje
CREATE TABLE IF NOT EXISTS incidencias_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  tipo_incidencia TEXT NOT NULL CHECK (tipo_incidencia IN (
    'retraso', 'averia_camion', 'documentacion_faltante',
    'producto_danado', 'accidente', 'otro'
  )),
  severidad TEXT DEFAULT 'media' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')),
  descripcion TEXT NOT NULL,
  resolucion TEXT,
  fecha_incidencia TIMESTAMPTZ DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  reportado_por UUID NOT NULL REFERENCES auth.users(id),
  resuelto_por UUID REFERENCES auth.users(id),
  fotos_incidencia JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_id ON incidencias_viaje(viaje_id);

-- PASO 5: RLS Policies
ALTER TABLE viajes_despacho ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_control_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver viajes"
ON viajes_despacho FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden insertar viajes"
ON viajes_despacho FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar viajes"
ON viajes_despacho FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden ver registros"
ON registro_control_acceso FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden insertar registros"
ON registro_control_acceso FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden ver incidencias"
ON incidencias_viaje FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden insertar incidencias"
ON incidencias_viaje FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Tablas básicas creadas exitosamente';
  RAISE NOTICE '📊 Tablas: viajes_despacho, registro_control_acceso, incidencias_viaje';
  RAISE NOTICE '⚠️  Los triggers automáticos se agregarán en el siguiente paso';
END $$;

-- ===========================================
-- SCRIPT CONSOLIDADO: Setup Inicial para DEV
-- Nodexia-Web - Entorno de Desarrollo
-- ===========================================
-- Ejecutar en: Supabase SQL Editor del proyecto DEV
-- 
-- Este script crea TODA la estructura necesaria
-- para un proyecto Supabase de desarrollo nuevo.
-- ===========================================

-- ========================================
-- FASE 1: Configuración inicial
-- ========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- FASE 2: Tablas base (auth-related)
-- ========================================

-- Tabla de empresas (core del sistema)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cuit TEXT UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('planta', 'transporte')),
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para empresas
CREATE INDEX IF NOT EXISTS idx_empresas_tipo ON public.empresas(tipo);
CREATE INDEX IF NOT EXISTS idx_empresas_activo ON public.empresas(activo);
CREATE INDEX IF NOT EXISTS idx_empresas_cuit ON public.empresas(cuit);

-- Tabla de roles por empresa
CREATE TABLE IF NOT EXISTS public.roles_empresa (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  permisos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar roles básicos
INSERT INTO public.roles_empresa (nombre, descripcion) VALUES
  ('admin', 'Administrador de la empresa'),
  ('operador', 'Operador de despachos'),
  ('chofer', 'Chofer de transporte'),
  ('visualizador', 'Solo lectura')
ON CONFLICT (nombre) DO NOTHING;

-- Tabla de usuarios por empresa
CREATE TABLE IF NOT EXISTS public.usuarios_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rol_id INTEGER NOT NULL REFERENCES public.roles_empresa(id),
  nombre TEXT,
  apellido TEXT,
  dni TEXT,
  telefono TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

-- Índices para usuarios_empresa
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_id ON public.usuarios_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_empresa_id ON public.usuarios_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_rol_id ON public.usuarios_empresa(rol_id);

-- ========================================
-- FASE 3: Red de empresas
-- ========================================

-- Relaciones entre empresas (planta <-> transporte)
CREATE TABLE IF NOT EXISTS public.relaciones_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_origen_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  empresa_destino_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_relacion TEXT NOT NULL CHECK (tipo_relacion IN ('cliente', 'proveedor', 'asociado')),
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'pendiente', 'rechazada', 'suspendida')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_origen_id, empresa_destino_id)
);

-- Índices para relaciones
CREATE INDEX IF NOT EXISTS idx_relaciones_origen ON public.relaciones_empresas(empresa_origen_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_destino ON public.relaciones_empresas(empresa_destino_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_estado ON public.relaciones_empresas(estado);

-- ========================================
-- FASE 4: Flota (camiones, acoplados, choferes)
-- ========================================

-- Tabla de camiones
CREATE TABLE IF NOT EXISTS public.camiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transporte UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  patente TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  capacidad_kg NUMERIC,
  tipo TEXT,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_uso', 'mantenimiento', 'inactivo')),
  documentacion_ok BOOLEAN DEFAULT false,
  vencimiento_vtv DATE,
  vencimiento_seguro DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para camiones
CREATE INDEX IF NOT EXISTS idx_camiones_transporte ON public.camiones(id_transporte);
CREATE INDEX IF NOT EXISTS idx_camiones_patente ON public.camiones(patente);
CREATE INDEX IF NOT EXISTS idx_camiones_estado ON public.camiones(estado);

-- Tabla de acoplados
CREATE TABLE IF NOT EXISTS public.acoplados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transporte UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  patente TEXT NOT NULL,
  tipo TEXT,
  capacidad_kg NUMERIC,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_uso', 'mantenimiento', 'inactivo')),
  documentacion_ok BOOLEAN DEFAULT false,
  vencimiento_vtv DATE,
  vencimiento_seguro DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para acoplados
CREATE INDEX IF NOT EXISTS idx_acoplados_transporte ON public.acoplados(id_transporte);
CREATE INDEX IF NOT EXISTS idx_acoplados_patente ON public.acoplados(patente);
CREATE INDEX IF NOT EXISTS idx_acoplados_estado ON public.acoplados(estado);

-- Tabla de choferes
CREATE TABLE IF NOT EXISTS public.choferes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transporte UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  licencia TEXT,
  vencimiento_licencia DATE,
  telefono TEXT,
  email TEXT,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_viaje', 'no_disponible', 'inactivo')),
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para choferes
CREATE INDEX IF NOT EXISTS idx_choferes_transporte ON public.choferes(id_transporte);
CREATE INDEX IF NOT EXISTS idx_choferes_user_id ON public.choferes(user_id);
CREATE INDEX IF NOT EXISTS idx_choferes_dni ON public.choferes(dni);
CREATE INDEX IF NOT EXISTS idx_choferes_estado ON public.choferes(estado);

-- ========================================
-- FASE 5: Sistema de viajes y despachos
-- ========================================

-- Tabla principal de viajes/despachos
CREATE TABLE IF NOT EXISTS public.viajes_despacho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  
  -- Empresa que crea el viaje (planta)
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Empresa de transporte asignada (COLUMNAS UNIFICADAS - usar estas)
  transport_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  camion_id UUID REFERENCES public.camiones(id) ON DELETE SET NULL,
  acoplado_id UUID REFERENCES public.acoplados(id) ON DELETE SET NULL,
  chofer_id UUID REFERENCES public.choferes(id) ON DELETE SET NULL,
  
  -- Detalles del viaje
  origen TEXT NOT NULL,
  origen_lat NUMERIC,
  origen_lng NUMERIC,
  destino TEXT NOT NULL,
  destino_lat NUMERIC,
  destino_lng NUMERIC,
  
  -- Producto/carga
  producto TEXT,
  cantidad NUMERIC,
  unidad TEXT,
  observaciones TEXT,
  
  -- Fechas
  fecha_carga DATE NOT NULL,
  hora_carga_desde TIME,
  hora_carga_hasta TIME,
  fecha_entrega DATE,
  fecha_descarga DATE,
  hora_descarga TIME,
  
  -- Estados (sistema dual)
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente', 'ofrecido', 'asignado', 'aceptado', 
    'en_transito', 'en_origen', 'cargando', 'en_destino', 
    'descargando', 'completado', 'cancelado', 'expirado'
  )),
  estado_tracking TEXT DEFAULT 'sin_iniciar' CHECK (estado_tracking IN (
    'sin_iniciar', 'en_camino_origen', 'en_origen', 'cargando',
    'en_transito', 'en_destino', 'descargando', 'finalizado'
  )),
  
  -- Histórico (para cancelaciones)
  id_transporte_cancelado UUID REFERENCES public.empresas(id),
  motivo_cancelacion TEXT,
  
  -- Metadata
  tipo TEXT DEFAULT 'normal',
  prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  
  -- Usuario que creó el viaje
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para viajes_despacho
CREATE INDEX IF NOT EXISTS idx_viajes_empresa ON public.viajes_despacho(empresa_id);
CREATE INDEX IF NOT EXISTS idx_viajes_transport ON public.viajes_despacho(transport_id);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON public.viajes_despacho(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_fecha_carga ON public.viajes_despacho(fecha_carga);
CREATE INDEX IF NOT EXISTS idx_viajes_codigo ON public.viajes_despacho(codigo);
CREATE INDEX IF NOT EXISTS idx_viajes_chofer ON public.viajes_despacho(chofer_id);
CREATE INDEX IF NOT EXISTS idx_viajes_camion ON public.viajes_despacho(camion_id);

-- Tabla de ofertas de viajes
CREATE TABLE IF NOT EXISTS public.ofertas_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES public.viajes_despacho(id) ON DELETE CASCADE,
  transporte_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'expirada')),
  created_at TIMESTAMPTZ DEFAULT now(),
  respondida_at TIMESTAMPTZ,
  UNIQUE(viaje_id, transporte_id)
);

-- Índices para ofertas
CREATE INDEX IF NOT EXISTS idx_ofertas_viaje ON public.ofertas_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_transporte ON public.ofertas_viaje(transporte_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON public.ofertas_viaje(estado);

-- Tabla de incidencias
CREATE TABLE IF NOT EXISTS public.incidencias_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES public.viajes_despacho(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  reportado_por UUID REFERENCES auth.users(id),
  resuelto BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de control de acceso (llegadas a planta)
CREATE TABLE IF NOT EXISTS public.registro_control_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES public.viajes_despacho(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  registrado_por UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- FASE 6: Funciones SQL esenciales
-- ========================================

-- Función para generar código de viaje
CREATE OR REPLACE FUNCTION generar_codigo_viaje()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'DSP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                  LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código
DROP TRIGGER IF EXISTS tr_generar_codigo_viaje ON public.viajes_despacho;
CREATE TRIGGER tr_generar_codigo_viaje
  BEFORE INSERT ON public.viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION generar_codigo_viaje();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER tr_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_usuarios_empresa_updated_at BEFORE UPDATE ON public.usuarios_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_viajes_updated_at BEFORE UPDATE ON public.viajes_despacho FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_camiones_updated_at BEFORE UPDATE ON public.camiones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_acoplados_updated_at BEFORE UPDATE ON public.acoplados FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_choferes_updated_at BEFORE UPDATE ON public.choferes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para obtener empresa del usuario actual
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.usuarios_empresa 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para verificar rol del usuario
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_empresa ue
    JOIN public.roles_empresa re ON ue.rol_id = re.id
    WHERE ue.user_id = auth.uid() 
    AND re.nombre = required_role
    AND ue.activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para reprogramar viaje (CORREGIDA - limpia todos los recursos)
CREATE OR REPLACE FUNCTION reprogramar_viaje(
  p_viaje_id UUID,
  p_nueva_fecha DATE
)
RETURNS JSONB AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  UPDATE public.viajes_despacho
  SET 
    fecha_carga = p_nueva_fecha,
    estado = 'pendiente',
    estado_tracking = 'sin_iniciar',
    -- Limpiar TODOS los recursos asignados
    transport_id = NULL,
    camion_id = NULL,
    acoplado_id = NULL,
    chofer_id = NULL,
    updated_at = NOW()
  WHERE id = p_viaje_id;
  
  -- Cancelar ofertas existentes
  UPDATE public.ofertas_viaje
  SET estado = 'expirada'
  WHERE viaje_id = p_viaje_id AND estado = 'pendiente';
  
  v_resultado := jsonb_build_object(
    'success', true,
    'message', 'Viaje reprogramado exitosamente',
    'nueva_fecha', p_nueva_fecha
  );
  
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- FASE 7: Políticas RLS básicas
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relaciones_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoplados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choferes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viajes_despacho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas_viaje ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas (usuarios pueden ver su empresa y relacionadas)
CREATE POLICY "Usuarios ven su empresa" ON public.empresas
  FOR SELECT USING (
    id IN (SELECT empresa_id FROM public.usuarios_empresa WHERE user_id = auth.uid())
    OR
    id IN (
      SELECT empresa_destino_id FROM public.relaciones_empresas 
      WHERE empresa_origen_id = get_user_empresa_id() AND estado = 'activa'
    )
    OR
    id IN (
      SELECT empresa_origen_id FROM public.relaciones_empresas 
      WHERE empresa_destino_id = get_user_empresa_id() AND estado = 'activa'
    )
  );

-- Políticas para usuarios_empresa
CREATE POLICY "Usuarios ven usuarios de su empresa" ON public.usuarios_empresa
  FOR SELECT USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Admin puede insertar usuarios" ON public.usuarios_empresa
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() AND user_has_role('admin'));

CREATE POLICY "Admin puede actualizar usuarios" ON public.usuarios_empresa
  FOR UPDATE USING (empresa_id = get_user_empresa_id() AND user_has_role('admin'));

-- Políticas para viajes_despacho
CREATE POLICY "Plantas ven sus viajes" ON public.viajes_despacho
  FOR SELECT USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Transportes ven viajes asignados" ON public.viajes_despacho
  FOR SELECT USING (transport_id = get_user_empresa_id());

CREATE POLICY "Transportes ven viajes ofrecidos" ON public.viajes_despacho
  FOR SELECT USING (
    id IN (SELECT viaje_id FROM public.ofertas_viaje WHERE transporte_id = get_user_empresa_id())
  );

CREATE POLICY "Plantas pueden crear viajes" ON public.viajes_despacho
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Plantas pueden actualizar sus viajes" ON public.viajes_despacho
  FOR UPDATE USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Transportes pueden actualizar viajes asignados" ON public.viajes_despacho
  FOR UPDATE USING (transport_id = get_user_empresa_id());

-- Políticas para flota (camiones, acoplados, choferes)
CREATE POLICY "Transportes ven su flota - camiones" ON public.camiones
  FOR ALL USING (id_transporte = get_user_empresa_id());

CREATE POLICY "Transportes ven su flota - acoplados" ON public.acoplados
  FOR ALL USING (id_transporte = get_user_empresa_id());

CREATE POLICY "Transportes ven su flota - choferes" ON public.choferes
  FOR ALL USING (id_transporte = get_user_empresa_id());

-- Políticas para ofertas
CREATE POLICY "Plantas ven ofertas de sus viajes" ON public.ofertas_viaje
  FOR SELECT USING (viaje_id IN (SELECT id FROM public.viajes_despacho WHERE empresa_id = get_user_empresa_id()));

CREATE POLICY "Transportes ven sus ofertas" ON public.ofertas_viaje
  FOR SELECT USING (transporte_id = get_user_empresa_id());

CREATE POLICY "Transportes pueden responder ofertas" ON public.ofertas_viaje
  FOR UPDATE USING (transporte_id = get_user_empresa_id());

-- ========================================
-- FASE 8: Datos iniciales de prueba
-- ========================================

-- Crear empresa de prueba tipo planta
INSERT INTO public.empresas (id, nombre, cuit, tipo, direccion, localidad, provincia)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Planta Demo DEV',
  '30-12345678-9',
  'planta',
  'Av. Desarrollo 123',
  'Buenos Aires',
  'Buenos Aires'
) ON CONFLICT DO NOTHING;

-- Crear empresa de prueba tipo transporte
INSERT INTO public.empresas (id, nombre, cuit, tipo, direccion, localidad, provincia)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Transporte Demo DEV',
  '30-98765432-1',
  'transporte',
  'Calle Test 456',
  'Córdoba',
  'Córdoba'
) ON CONFLICT DO NOTHING;

-- Crear relación entre las empresas demo
INSERT INTO public.relaciones_empresas (empresa_origen_id, empresa_destino_id, tipo_relacion, estado)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'cliente',
  'activa'
) ON CONFLICT DO NOTHING;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

SELECT 'Setup DEV completado exitosamente' as status, NOW() as ejecutado_en;

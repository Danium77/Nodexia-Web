-- Migración 028 v2: Sistema de auditoría de cancelaciones (versión simplificada)
-- Fecha: 2026-02-02
-- Ejecutar en orden: primero tabla, luego policies, luego vistas

-- PASO 1: Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS cancelaciones_despachos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relaciones
  despacho_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cancelado_por_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos del despacho cancelado (snapshot)
  pedido_id VARCHAR(50) NOT NULL,
  cliente_nombre VARCHAR(255),
  origen_nombre VARCHAR(255),
  destino_nombre VARCHAR(255),
  scheduled_date DATE,
  scheduled_time TIME,
  estado_al_cancelar VARCHAR(50),
  
  -- Información de auditoría
  motivo_cancelacion TEXT NOT NULL,
  motivo_categoria VARCHAR(50),
  
  -- Impacto operativo
  tenia_chofer_asignado BOOLEAN DEFAULT FALSE,
  tenia_camion_asignado BOOLEAN DEFAULT FALSE,
  tenia_acoplado_asignado BOOLEAN DEFAULT FALSE,
  fue_reprogramado_previamente BOOLEAN DEFAULT FALSE,
  cantidad_reprogramaciones_previas INT DEFAULT 0,
  
  -- Sistema de calificaciones futuro
  afecta_calificacion_planta BOOLEAN DEFAULT FALSE,
  afecta_calificacion_transporte BOOLEAN DEFAULT FALSE,
  calificacion_impacto DECIMAL(2,1),
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Índices
CREATE INDEX idx_cancelaciones_despacho ON cancelaciones_despachos(despacho_id);
CREATE INDEX idx_cancelaciones_empresa ON cancelaciones_despachos(empresa_id);
CREATE INDEX idx_cancelaciones_usuario ON cancelaciones_despachos(cancelado_por_user_id);
CREATE INDEX idx_cancelaciones_fecha ON cancelaciones_despachos(created_at DESC);
CREATE INDEX idx_cancelaciones_categoria ON cancelaciones_despachos(motivo_categoria);

-- PASO 3: Comentarios
COMMENT ON TABLE cancelaciones_despachos IS 'Auditoría completa de cancelaciones de despachos';

-- PASO 4: RLS
ALTER TABLE cancelaciones_despachos ENABLE ROW LEVEL SECURITY;

-- PASO 5: Policies
CREATE POLICY select_cancelaciones_empresa ON cancelaciones_despachos
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
    )
  );

CREATE POLICY insert_cancelaciones_coordinadores ON cancelaciones_despachos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.empresa_id = cancelaciones_despachos.empresa_id
        AND ue.rol_interno IN ('coordinador', 'admin_empresa', 'super_admin')
    )
  );

CREATE POLICY select_cancelaciones_admin ON cancelaciones_despachos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'super_admin'
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla cancelaciones_despachos creada exitosamente';
  RAISE NOTICE '🔐 RLS habilitado con 3 policies';
  RAISE NOTICE '📊 Próximo paso: Ejecutar 028_v3_vistas.sql para crear las vistas';
END $$;

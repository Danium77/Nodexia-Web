-- ============================================================
-- 081: Turnos de Recepción
-- Ventanas horarias para recepción en planta + reservas
-- ============================================================

-- 1. Ventanas de recepción (horario semanal de la planta)
CREATE TABLE IF NOT EXISTS ventanas_recepcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_planta_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,               -- "Turno Mañana", "Turno Tarde"
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  capacidad INT NOT NULL DEFAULT 1,   -- camiones simultáneos
  duracion_turno_minutos INT NOT NULL DEFAULT 60,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ck_ventana_horario CHECK (hora_fin > hora_inicio)
);

-- 2. Turnos reservados (reserva concreta para una fecha)
CREATE TABLE IF NOT EXISTS turnos_reservados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ventana_id UUID NOT NULL REFERENCES ventanas_recepcion(id) ON DELETE CASCADE,
  empresa_transporte_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  despacho_id UUID REFERENCES despachos(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'reservado'
    CHECK (estado IN ('reservado','confirmado','completado','cancelado','no_show')),
  patente_camion TEXT,
  chofer_nombre TEXT,
  observaciones TEXT,
  reservado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_ventanas_planta ON ventanas_recepcion(empresa_planta_id);
CREATE INDEX IF NOT EXISTS idx_ventanas_dia ON ventanas_recepcion(dia_semana, activa);
CREATE INDEX IF NOT EXISTS idx_turnos_ventana_fecha ON turnos_reservados(ventana_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_transporte ON turnos_reservados(empresa_transporte_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_despacho ON turnos_reservados(despacho_id);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos_reservados(estado, fecha);

-- 4. RLS
ALTER TABLE ventanas_recepcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_reservados ENABLE ROW LEVEL SECURITY;

-- Ventanas: lectura para todos los autenticados, escritura solo la planta dueña
CREATE POLICY ventanas_select ON ventanas_recepcion FOR SELECT TO authenticated USING (true);
CREATE POLICY ventanas_insert ON ventanas_recepcion FOR INSERT TO authenticated
  WITH CHECK (empresa_planta_id IN (
    SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
  ));
CREATE POLICY ventanas_update ON ventanas_recepcion FOR UPDATE TO authenticated
  USING (empresa_planta_id IN (
    SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
  ));
CREATE POLICY ventanas_delete ON ventanas_recepcion FOR DELETE TO authenticated
  USING (empresa_planta_id IN (
    SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
  ));

-- Turnos: lectura para planta y transporte involucrados, escritura para transporte
CREATE POLICY turnos_select ON turnos_reservados FOR SELECT TO authenticated
  USING (
    empresa_transporte_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid())
    OR ventana_id IN (
      SELECT v.id FROM ventanas_recepcion v
      JOIN usuarios_empresa ue ON ue.empresa_id = v.empresa_planta_id AND ue.user_id = auth.uid()
    )
  );
CREATE POLICY turnos_insert ON turnos_reservados FOR INSERT TO authenticated
  WITH CHECK (
    empresa_transporte_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid())
  );
CREATE POLICY turnos_update ON turnos_reservados FOR UPDATE TO authenticated
  USING (
    empresa_transporte_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid())
    OR ventana_id IN (
      SELECT v.id FROM ventanas_recepcion v
      JOIN usuarios_empresa ue ON ue.empresa_id = v.empresa_planta_id AND ue.user_id = auth.uid()
    )
  );

-- 5. Activar feature flag
UPDATE funciones_sistema SET activo = true WHERE clave = 'turnos_recepcion';

-- 6. Vista: disponibilidad (slots ocupados por ventana+fecha)
CREATE OR REPLACE VIEW vista_disponibilidad_turnos AS
SELECT
  v.id AS ventana_id,
  v.empresa_planta_id,
  v.nombre AS ventana_nombre,
  v.dia_semana,
  v.hora_inicio,
  v.hora_fin,
  v.capacidad,
  v.duracion_turno_minutos,
  t.fecha,
  COUNT(t.id) FILTER (WHERE t.estado NOT IN ('cancelado')) AS ocupados
FROM ventanas_recepcion v
LEFT JOIN turnos_reservados t ON t.ventana_id = v.id
WHERE v.activa = true
GROUP BY v.id, v.empresa_planta_id, v.nombre, v.dia_semana, v.hora_inicio, v.hora_fin, v.capacidad, v.duracion_turno_minutos, t.fecha;

-- 7. Registrar migración
INSERT INTO schema_migrations (version, name, filename, checksum, applied_at)
VALUES (81, 'turnos_recepcion', '081_turnos_recepcion.sql', md5('081_turnos_recepcion')::text, now())
ON CONFLICT (version) DO NOTHING;

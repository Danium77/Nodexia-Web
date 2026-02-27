-- ============================================================================
-- Migration 066: Perfil PyME y rol Vendedor
-- ============================================================================
-- OBJETIVO:
-- 1. Permitir que empresas tipo 'planta' tengan flota propia (camiones/choferes)
-- 2. Agregar campo referencia_cliente en despachos (nota de pedido / orden de compra)
-- 3. Crear tabla vendedor_clientes para vincular vendedores con sus clientes
-- 4. Agregar roles: coordinador_integral (PyME) y vendedor (solo lectura)
--
-- PRINCIPIO: Integración dinámica con el ecosistema Nodexia existente.
-- El perfil PyME NO es un entorno aislado. Usa las mismas tablas, APIs y RLS.
-- ============================================================================


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Campo tiene_flota_propia en empresas
-- ══════════════════════════════════════════════════════════════════════════════
-- Permite que una empresa tipo 'planta' gestione camiones y choferes propios
-- sin ser tipo 'transporte'. No ofrece sus camiones a terceros.

ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS tiene_flota_propia BOOLEAN DEFAULT false;

COMMENT ON COLUMN empresas.tiene_flota_propia IS
  'Indica si la empresa (tipo planta) gestiona flota propia de camiones/choferes. '
  'No la convierte en transporte: solo puede asignar su flota a sus propios despachos.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Campo referencia_cliente en despachos
-- ══════════════════════════════════════════════════════════════════════════════
-- Vincula el despacho con el pedido/orden de compra del cliente.
-- Aplica a TODO Nodexia, no solo PyME.
-- Diferente de pedido_id que es el código interno del despacho (DSP-YYYYMMDD-NNN).

ALTER TABLE despachos
ADD COLUMN IF NOT EXISTS referencia_cliente VARCHAR(100);

COMMENT ON COLUMN despachos.referencia_cliente IS
  'Referencia externa del cliente: nota de pedido, orden de compra, etc. '
  'Ej: NP-2026-0845, OC-12345. Permite trazabilidad pedido → despacho → viaje → entrega.';

-- Índice para búsquedas por referencia
CREATE INDEX IF NOT EXISTS idx_despachos_referencia_cliente
ON despachos(referencia_cliente)
WHERE referencia_cliente IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Tabla vendedor_clientes
-- ══════════════════════════════════════════════════════════════════════════════
-- Vincula vendedores con los clientes que gestionan.
-- Un vendedor solo ve despachos cuyo destino_empresa_id sea uno de sus clientes.

CREATE TABLE IF NOT EXISTS vendedor_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_vendedor_cliente UNIQUE (vendedor_user_id, cliente_empresa_id)
);

COMMENT ON TABLE vendedor_clientes IS
  'Relación vendedor ↔ clientes asignados. '
  'El vendedor solo ve despachos donde destino_empresa_id coincide con sus clientes.';

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_vendedor_clientes_vendedor
ON vendedor_clientes(vendedor_user_id) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_vendedor_clientes_empresa
ON vendedor_clientes(empresa_id) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_vendedor_clientes_cliente
ON vendedor_clientes(cliente_empresa_id) WHERE activo = true;

-- RLS para vendedor_clientes
ALTER TABLE vendedor_clientes ENABLE ROW LEVEL SECURITY;

-- Super admin ve todo
CREATE POLICY "Super admin ve vendedor_clientes"
ON vendedor_clientes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- Coordinadores/admin de la empresa pueden gestionar vendedores
CREATE POLICY "Coordinadores gestionan vendedor_clientes"
ON vendedor_clientes FOR ALL
USING (
  empresa_id IN (
    SELECT ue.empresa_id FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'administrativo')
  )
);

-- El vendedor puede ver sus propias asignaciones
CREATE POLICY "Vendedor ve sus clientes"
ON vendedor_clientes FOR SELECT
USING (
  vendedor_user_id = auth.uid()
);


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RLS: Vendedor ve despachos de sus clientes
-- ══════════════════════════════════════════════════════════════════════════════
-- No reemplaza políticas existentes, AGREGA una nueva para el rol vendedor.

-- Política adicional SELECT en despachos para vendedores
CREATE POLICY "Vendedor ve despachos de sus clientes"
ON despachos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    JOIN vendedor_clientes vc ON vc.vendedor_user_id = ue.user_id
      AND vc.empresa_id = ue.empresa_id
      AND vc.activo = true
    WHERE ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno = 'vendedor'
      AND ue.empresa_id = despachos.empresa_id
      AND vc.cliente_empresa_id = COALESCE(
        despachos.destino_empresa_id,
        (SELECT u.empresa_id FROM ubicaciones u WHERE u.id = despachos.destino_id)
      )
  )
);

-- Política adicional SELECT en viajes_despacho para vendedores
CREATE POLICY "Vendedor ve viajes de despachos de sus clientes"
ON viajes_despacho FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM despachos d
    JOIN usuarios_empresa ue ON ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno = 'vendedor'
      AND ue.empresa_id = d.empresa_id
    JOIN vendedor_clientes vc ON vc.vendedor_user_id = ue.user_id
      AND vc.empresa_id = ue.empresa_id
      AND vc.activo = true
      AND vc.cliente_empresa_id = COALESCE(
        d.destino_empresa_id,
        (SELECT u.empresa_id FROM ubicaciones u WHERE u.id = d.destino_id)
      )
    WHERE d.id = viajes_despacho.despacho_id
  )
);


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Permisos para coordinador_integral
-- ══════════════════════════════════════════════════════════════════════════════
-- coordinador_integral tiene los mismos permisos que:
-- coordinador + control_acceso + supervisor + administrativo
-- No necesita políticas RLS nuevas si las existentes ya cubren esos roles.
-- Solo necesitamos agregar 'coordinador_integral' a las políticas que filtran
-- por rol_interno.

-- Actualizar políticas existentes que filtran por rol_interno para incluir
-- coordinador_integral. Ejemplo: documentos_entidad INSERT, UPDATE.

-- UPDATE policy en documentos_entidad: agregar coordinador_integral
DROP POLICY IF EXISTS "Subir documentos según rol" ON documentos_entidad;
CREATE POLICY "Subir documentos según rol" ON documentos_entidad
FOR INSERT
WITH CHECK (
  (empresa_id IN (
    SELECT ue.empresa_id FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'administrativo', 'supervisor')
  ))
  OR ((entidad_tipo = 'chofer') AND (entidad_id IN (
    SELECT c.id FROM choferes c WHERE c.usuario_id = auth.uid()
  )))
  OR ((validacion_excepcional = true) AND (EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno IN ('control_acceso', 'coordinador', 'coordinador_integral', 'supervisor')
  )))
);

DROP POLICY IF EXISTS "Validar documentos según rol" ON documentos_entidad;
CREATE POLICY "Validar documentos según rol" ON documentos_entidad
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid() AND activo = true
  ))
  OR (empresa_id IN (
    SELECT ue.empresa_id FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'supervisor', 'control_acceso')
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid() AND activo = true
  ))
  OR (empresa_id IN (
    SELECT ue.empresa_id FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.activo = true
      AND ue.rol_interno IN ('coordinador', 'coordinador_integral', 'supervisor', 'control_acceso')
  ))
);


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Trigger: updated_at automático para vendedor_clientes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_vendedor_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendedor_clientes_updated_at ON vendedor_clientes;
CREATE TRIGGER trg_vendedor_clientes_updated_at
  BEFORE UPDATE ON vendedor_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_vendedor_clientes_updated_at();


-- ══════════════════════════════════════════════════════════════════════════════
-- RESUMEN DE CAMBIOS
-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ empresas.tiene_flota_propia (boolean, default false)
-- ✅ despachos.referencia_cliente (varchar 100, nullable)
-- ✅ vendedor_clientes (nueva tabla con RLS)
-- ✅ RLS vendedor en despachos y viajes_despacho
-- ✅ coordinador_integral en políticas de documentos_entidad
-- ✅ Trigger updated_at en vendedor_clientes
--
-- SIN IMPACTO EN:
-- ✅ Tablas existentes (solo se agregan columnas opcionales)
-- ✅ APIs existentes (no se modifican endpoints)
-- ✅ Frontend existente (campos nuevos son opcionales)
-- ✅ Flujos de otros roles (no se alteran permisos existentes)

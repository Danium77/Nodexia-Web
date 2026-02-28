-- ================================================================
-- Migración 069: Cleanup: eliminar tablas y objetos legacy de PROD
-- Fecha: 2026-02-28
-- Generado automáticamente por generate-sync-migration.js
-- Elimina tablas que existen en PROD pero no en DEV (legacy/obsoletas).
-- IMPORTANTE: Los datos en estas tablas se perderán. Se hace backup primero.
-- ================================================================

-- ── Eliminar tablas legacy ──────────────────────────────
-- Estas tablas existen en PROD pero no en DEV.
-- El código actual no las usa.

DROP TABLE IF EXISTS "auditoria_roles" CASCADE;
DROP TABLE IF EXISTS "coordinador_transporte" CASCADE;
DROP TABLE IF EXISTS "despachos_red" CASCADE;
DROP TABLE IF EXISTS "destinos" CASCADE;
DROP TABLE IF EXISTS "documentos" CASCADE;
DROP TABLE IF EXISTS "documentos_viaje" CASCADE;
DROP TABLE IF EXISTS "historial_ubicaciones" CASCADE;
DROP TABLE IF EXISTS "incidencias" CASCADE;
DROP TABLE IF EXISTS "locations" CASCADE;
DROP TABLE IF EXISTS "logs_admin" CASCADE;
DROP TABLE IF EXISTS "origenes" CASCADE;
DROP TABLE IF EXISTS "pagos" CASCADE;
DROP TABLE IF EXISTS "planes_suscripcion" CASCADE;
DROP TABLE IF EXISTS "planta_destinos" CASCADE;
DROP TABLE IF EXISTS "planta_origenes" CASCADE;
DROP TABLE IF EXISTS "planta_transportes" CASCADE;
DROP TABLE IF EXISTS "preferencias_transporte_red" CASCADE;
DROP TABLE IF EXISTS "profile_users" CASCADE;
DROP TABLE IF EXISTS "registro_control_acceso" CASCADE;
DROP TABLE IF EXISTS "relaciones_empresa" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TABLE IF EXISTS "solicitudes_registro" CASCADE;
DROP TABLE IF EXISTS "suscripciones_empresa" CASCADE;
DROP TABLE IF EXISTS "tipos_empresa_ecosistema" CASCADE;
DROP TABLE IF EXISTS "transportes" CASCADE;
DROP TABLE IF EXISTS "viajes_auditoria" CASCADE;
DROP TABLE IF EXISTS "visualizaciones_ofertas" CASCADE;

-- ── Crear tablas faltantes en PROD ──────────────────────

CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "phone" text,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "dni" text,
  "cuit" text,
  "address" text,
  "city" text,
  "zip" text,
  "province" text,
  "dni_normalized" text
);

ALTER TABLE "customers" ADD PRIMARY KEY ("id");

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "recurso_asignaciones" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "recurso_id" uuid NOT NULL,
  "tipo_recurso" text NOT NULL,
  "empresa_id" uuid NOT NULL,
  "fecha_inicio" timestamp with time zone NOT NULL DEFAULT now(),
  "fecha_fin" timestamp with time zone,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "recurso_asignaciones" ADD PRIMARY KEY ("id");

ALTER TABLE "recurso_asignaciones" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "vendedor_clientes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vendedor_user_id" uuid NOT NULL,
  "empresa_id" uuid NOT NULL,
  "cliente_empresa_id" uuid NOT NULL,
  "activo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "vendedor_clientes" ADD PRIMARY KEY ("id");

ALTER TABLE "vendedor_clientes" ENABLE ROW LEVEL SECURITY;

-- ── Crear índices faltantes (solo los que no dependen de columnas nuevas) ──
-- Los índices que dependen de deleted_at, referencia_cliente, etc. 
-- se crean en 070 después de agregar esas columnas.

CREATE INDEX IF NOT EXISTS idx_acoplados_patente ON public.acoplados USING btree (patente);
CREATE INDEX IF NOT EXISTS idx_acoplados_transporte ON public.acoplados USING btree (empresa_id);
CREATE INDEX IF NOT EXISTS idx_camiones_patente ON public.camiones USING btree (patente);
CREATE INDEX IF NOT EXISTS idx_camiones_transporte ON public.camiones USING btree (empresa_id);
CREATE INDEX IF NOT EXISTS idx_choferes_dni ON public.choferes USING btree (dni);
CREATE INDEX IF NOT EXISTS idx_choferes_transporte ON public.choferes USING btree (empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachos_destino_empresa ON public.despachos USING btree (destino_empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachos_empresa ON public.despachos USING btree (empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachos_origen_destino ON public.despachos USING btree (origen_id, destino_id);
CREATE INDEX IF NOT EXISTS idx_despachos_origen_empresa ON public.despachos USING btree (origen_empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachos_pedido ON public.despachos USING btree (pedido_id);
CREATE INDEX IF NOT EXISTS idx_doc_reconfirmacion_pendiente ON public.documentos_entidad USING btree (requiere_reconfirmacion_backoffice) WHERE ((requiere_reconfirmacion_backoffice = true) AND (activo = true));
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doc_activo_por_tipo ON public.documentos_entidad USING btree (entidad_tipo, entidad_id, tipo_documento) WHERE (activo = true);
CREATE INDEX IF NOT EXISTS idx_empresas_cuit ON public.empresas USING btree (cuit);
CREATE INDEX IF NOT EXISTS idx_estado_carga_viaje_estado ON public.estado_carga_viaje USING btree (estado_carga);
CREATE INDEX IF NOT EXISTS idx_estado_carga_viaje_viaje_id ON public.estado_carga_viaje USING btree (viaje_id);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON public.historial_red_nodexia USING btree (accion);
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON public.ofertas_red_nodexia USING btree (estado_oferta);
CREATE INDEX IF NOT EXISTS idx_ofertas_fecha ON public.ofertas_red_nodexia USING btree (fecha_oferta);
CREATE INDEX IF NOT EXISTS idx_relaciones_cliente ON public.relaciones_empresas USING btree (empresa_cliente_id);
CREATE INDEX IF NOT EXISTS idx_requisitos_tipo_camion ON public.requisitos_viaje_red USING btree (tipo_camion);
CREATE INDEX IF NOT EXISTS idx_requisitos_tipo_carga ON public.requisitos_viaje_red USING btree (tipo_carga);
CREATE UNIQUE INDEX IF NOT EXISTS roles_empresa_nombre_key ON public.roles_empresa USING btree (nombre);
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON public.super_admins USING btree (email);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_empresa ON public.ubicaciones USING btree (empresa_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_nombre_lower ON public.ubicaciones USING btree (lower(TRIM(BOTH FROM nombre)));
CREATE INDEX IF NOT EXISTS idx_ubicaciones_chofer_id ON public.ubicaciones_choferes USING btree (chofer_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_chofer_timestamp ON public.ubicaciones_choferes USING btree (chofer_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_viaje_id ON public.ubicaciones_choferes USING btree (viaje_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_viaje_timestamp ON public.ubicaciones_choferes USING btree (viaje_id, "timestamp" DESC) WHERE (viaje_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_empresa_user_id_empresa_id_key ON public.usuarios_empresa USING btree (user_id, empresa_id);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON public.viajes_despacho USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_viajes_id_chofer ON public.viajes_despacho USING btree (id_chofer);
CREATE INDEX IF NOT EXISTS idx_viajes_id_transporte ON public.viajes_despacho USING btree (id_transporte);
CREATE INDEX IF NOT EXISTS idx_viajes_transporte ON public.viajes_despacho USING btree (id_transporte);
CREATE INDEX IF NOT EXISTS idx_viajes_red_empresa ON public.viajes_red_nodexia USING btree (empresa_solicitante_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_estado ON public.viajes_red_nodexia USING btree (estado_red);
CREATE INDEX IF NOT EXISTS idx_viajes_red_fecha ON public.viajes_red_nodexia USING btree (fecha_publicacion);
CREATE INDEX IF NOT EXISTS idx_viajes_red_transporte ON public.viajes_red_nodexia USING btree (transporte_asignado_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_viaje ON public.viajes_red_nodexia USING btree (viaje_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_viaje_red ON public.viajes_red_nodexia USING btree (viaje_id);


-- ── Resultado ────────────────────────────────────────────
-- Migración 069: eliminados: 27, creados: 3
DO $$ BEGIN
  RAISE NOTICE '✅ Migración 069 completada: eliminados: 27, creados: 3';
END $$;
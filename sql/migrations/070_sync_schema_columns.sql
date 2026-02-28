-- ================================================================
-- Migración 070: Schema sync: sincronizar columnas entre DEV y PROD
-- Fecha: 2026-02-28
-- Generado automáticamente por generate-sync-migration.js
-- Agrega columnas faltantes, elimina columnas obsoletas, corrige tipos.
-- ================================================================

-- ── Pre-cleanup: crear cast implícito para tipo_notificacion ────
-- Trigger functions pueden comparar tipo_notificacion = 'text_value'
-- sin cast explícito, lo que falla durante ALTER TABLE.
DO $$ BEGIN
  EXECUTE 'CREATE CAST (text AS tipo_notificacion) WITH INOUT AS IMPLICIT';
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_object THEN NULL;
END $$;

-- ── Pre-cleanup: eliminar TODOS los triggers de PROD ────────────
-- Trigger functions que comparan tipo_notificacion con text fallan durante ALTER.
-- Se recrean en 072_sync_functions.sql
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON ' || quote_ident(r.event_object_table);
  END LOOP;
  RAISE NOTICE 'Dropped all triggers from public schema';
END $$;

-- ── Pre-cleanup: eliminar TODAS las vistas de PROD ──────────────
-- Las vistas legacy bloquean ALTER TYPE en columnas referenciadas.
-- Si DEV necesita vistas, se crearán en 072_sync_functions.
DO $$ 
DECLARE
  v_name text;
BEGIN
  FOR v_name IN 
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
    AND viewname NOT LIKE 'v_migration%'
  LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(v_name) || ' CASCADE';
    RAISE NOTICE 'Dropped view: %', v_name;
  END LOOP;
END $$;

-- ── Pre-cleanup: eliminar TODAS las RLS policies de PROD ────────
-- Se recrean en 071_sync_rls_policies.sql con las definiciones de DEV.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
  END LOOP;
  RAISE NOTICE 'Dropped all RLS policies from public schema';
END $$;

-- ── acoplados ──
ALTER TABLE "acoplados" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "acoplados" DROP COLUMN IF EXISTS "id_transporte" CASCADE;
ALTER TABLE "acoplados" DROP COLUMN IF EXISTS "tipo" CASCADE;
ALTER TABLE "acoplados" DROP COLUMN IF EXISTS "activo" CASCADE;
ALTER TABLE "acoplados" ALTER COLUMN "marca" DROP NOT NULL;
ALTER TABLE "acoplados" ALTER COLUMN "modelo" DROP NOT NULL;

-- ── camiones ──
ALTER TABLE "camiones" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "camiones" DROP COLUMN IF EXISTS "id_transporte" CASCADE;
ALTER TABLE "camiones" DROP COLUMN IF EXISTS "tipo" CASCADE;
ALTER TABLE "camiones" DROP COLUMN IF EXISTS "activo" CASCADE;
ALTER TABLE "camiones" DROP COLUMN IF EXISTS "estado" CASCADE;
ALTER TABLE "camiones" ALTER COLUMN "marca" DROP NOT NULL;
ALTER TABLE "camiones" ALTER COLUMN "modelo" DROP NOT NULL;

-- ── choferes ──
ALTER TABLE "choferes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "choferes" DROP COLUMN IF EXISTS "id_transporte" CASCADE;

-- ── configuracion_sistema ──
-- Migrar de (id, clave, valor) a (key, value)
ALTER TABLE "configuracion_sistema" ADD COLUMN IF NOT EXISTS "key" text;
ALTER TABLE "configuracion_sistema" ADD COLUMN IF NOT EXISTS "value" jsonb;
-- Copiar datos existentes si hay
UPDATE "configuracion_sistema" SET "key" = "clave", "value" = to_jsonb("valor") 
  WHERE "key" IS NULL AND "clave" IS NOT NULL;
ALTER TABLE "configuracion_sistema" DROP COLUMN IF EXISTS "id" CASCADE;
ALTER TABLE "configuracion_sistema" DROP COLUMN IF EXISTS "clave" CASCADE;
ALTER TABLE "configuracion_sistema" DROP COLUMN IF EXISTS "valor" CASCADE;
ALTER TABLE "configuracion_sistema" DROP COLUMN IF EXISTS "updated_by" CASCADE;
-- Agregar PK en key si no existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracion_sistema_pkey'
  ) THEN
    ALTER TABLE "configuracion_sistema" ADD PRIMARY KEY ("key");
  END IF;
END $$;

-- ── despachos ──
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "numero_despacho" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "cliente_id" uuid;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "cantidad_viajes" integer DEFAULT 1;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "scheduled_date_time" timestamp with time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "fecha_programada" timestamp with time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "hora_programada" time without time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "chofer_id" uuid;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "vehiculo_id" uuid;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "usuario_alta" uuid;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "fecha_alta" timestamp with time zone DEFAULT now();
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "tipo_carga" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "tipo_unidad" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "origen_nombre" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "destino_nombre" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "origen_direccion" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "destino_direccion" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "cantidad_viajes_pendientes" integer DEFAULT 0;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "fecha_expiracion" timestamp with time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "expirado" boolean DEFAULT false;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "motivo_cancelacion" text;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "fecha_cancelacion" timestamp with time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "usuario_cancelacion" uuid;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "publicado_red" boolean DEFAULT false;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "fecha_publicacion_red" timestamp with time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "referencia_cliente" character varying(100);
ALTER TABLE "despachos" DROP COLUMN IF EXISTS "scheduled_at" CASCADE;
ALTER TABLE "despachos" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "despachos" ALTER COLUMN "origen" DROP NOT NULL;
ALTER TABLE "despachos" ALTER COLUMN "destino" DROP NOT NULL;
ALTER TABLE "despachos" ALTER COLUMN "estado" DROP NOT NULL;
ALTER TABLE "despachos" ALTER COLUMN "estado" SET DEFAULT 'pendiente_transporte'::text;
ALTER TABLE "despachos" ALTER COLUMN "prioridad" SET DEFAULT 'media'::text;

-- ── documentos_entidad ──
ALTER TABLE "documentos_entidad" ALTER COLUMN "fecha_emision" DROP NOT NULL;

-- ── empresa_ubicaciones ──
-- Cambiar tipo: alias de "varchar(255)" a "text"
ALTER TABLE "empresa_ubicaciones" ALTER COLUMN "alias" TYPE text USING "alias"::text;
ALTER TABLE "empresa_ubicaciones" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "empresa_ubicaciones" ALTER COLUMN "updated_at" SET DEFAULT now();

-- ── empresas ──
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tiene_flota_propia" boolean DEFAULT false;
-- Cambiar tipo: nombre de "varchar(255)" a "varchar"
ALTER TABLE "empresas" ALTER COLUMN "nombre" TYPE character varying USING "nombre"::character varying;
-- Cambiar tipo: email de "varchar(255)" a "varchar"
ALTER TABLE "empresas" ALTER COLUMN "email" TYPE character varying USING "email"::character varying;
ALTER TABLE "empresas" ALTER COLUMN "tipo_empresa" SET DEFAULT 'planta'::text;
ALTER TABLE "empresas" ALTER COLUMN "fecha_creacion" DROP DEFAULT;
ALTER TABLE "empresas" ALTER COLUMN "fecha_suscripcion" DROP DEFAULT;
-- Cambiar tipo: estado_suscripcion de "varchar(20)" a "varchar"
ALTER TABLE "empresas" ALTER COLUMN "estado_suscripcion" TYPE character varying USING "estado_suscripcion"::character varying;
ALTER TABLE "empresas" ALTER COLUMN "estado_suscripcion" DROP DEFAULT;
ALTER TABLE "empresas" ALTER COLUMN "configuracion_empresa" DROP DEFAULT;

-- ── estado_carga_viaje ──
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "fecha_planificado" timestamp with time zone;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "fecha_en_proceso_carga" timestamp with time zone;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "fecha_cargado" timestamp with time zone;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "fecha_en_proceso_descarga" timestamp with time zone;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "observaciones" text;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "fecha_completado" timestamp with time zone;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "numero_remito" text;
ALTER TABLE "estado_carga_viaje" ADD COLUMN IF NOT EXISTS "numero_carta_porte" text;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "fecha_cancelacion" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "producto" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "peso_estimado_kg" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "temperatura_carga" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "remito_numero" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "remito_url" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "carta_porte_url" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "certificado_calidad_url" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "documentacion_adicional" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "tiene_faltante" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "detalle_faltante" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "peso_faltante_kg" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "tiene_rechazo" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "detalle_rechazo" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "cancelado_por" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "motivo_cancelacion" CASCADE;
ALTER TABLE "estado_carga_viaje" DROP COLUMN IF EXISTS "observaciones_carga" CASCADE;
ALTER TABLE "estado_carga_viaje" ALTER COLUMN "estado_carga" DROP NOT NULL;
-- Cambiar tipo: peso_real_kg de "numeric(10,2)" a "numeric"
ALTER TABLE "estado_carga_viaje" ALTER COLUMN "peso_real_kg" TYPE numeric USING "peso_real_kg"::numeric;

-- ── estado_unidad_viaje ──
ALTER TABLE "estado_unidad_viaje" DROP COLUMN IF EXISTS "fecha_creacion" CASCADE;
ALTER TABLE "estado_unidad_viaje" DROP COLUMN IF EXISTS "fecha_cancelacion" CASCADE;
ALTER TABLE "estado_unidad_viaje" DROP COLUMN IF EXISTS "velocidad_actual_kmh" CASCADE;
ALTER TABLE "estado_unidad_viaje" DROP COLUMN IF EXISTS "cancelado_por" CASCADE;
ALTER TABLE "estado_unidad_viaje" DROP COLUMN IF EXISTS "motivo_cancelacion" CASCADE;
ALTER TABLE "estado_unidad_viaje" ALTER COLUMN "estado_unidad" DROP NOT NULL;

-- ── historial_red_nodexia ──
ALTER TABLE "historial_red_nodexia" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;

-- ── incidencias_viaje ──
ALTER TABLE "incidencias_viaje" ADD COLUMN IF NOT EXISTS "latitud" numeric(10,8);
ALTER TABLE "incidencias_viaje" ADD COLUMN IF NOT EXISTS "longitud" numeric(11,8);
ALTER TABLE "incidencias_viaje" ADD COLUMN IF NOT EXISTS "estado_resolucion" character varying(30) DEFAULT 'pendiente'::character varying;
ALTER TABLE "incidencias_viaje" ADD COLUMN IF NOT EXISTS "comentario_resolucion" text;
ALTER TABLE "incidencias_viaje" ADD COLUMN IF NOT EXISTS "fecha_reporte" timestamp with time zone DEFAULT now();
ALTER TABLE "incidencias_viaje" ALTER COLUMN "reportado_por" DROP NOT NULL;
-- Cambiar tipo: tipo_incidencia de "text" a "varchar(50)"
ALTER TABLE "incidencias_viaje" ALTER COLUMN "tipo_incidencia" TYPE character varying(50) USING "tipo_incidencia"::character varying(50);

-- ── notificaciones ──
ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "datos_adicionales" CASCADE;
ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "fecha_lectura" CASCADE;
ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "enviada_push" CASCADE;
ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "fecha_envio_push" CASCADE;
ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "token_fcm" CASCADE;
-- Skip tipo_notificacion cast (will be handled separately if needed)
-- Column may already be the correct enum type in PROD
-- Cambiar tipo: titulo de "text" a "varchar(255)"
ALTER TABLE "notificaciones" ALTER COLUMN "titulo" TYPE character varying(255) USING "titulo"::character varying(255);

-- ── profiles ──
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "type" CASCADE;
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "cuit" CASCADE;
ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "profiles" ALTER COLUMN "name" DROP NOT NULL;

-- ── relaciones_empresas ──
ALTER TABLE "relaciones_empresas" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
-- Cambiar tipo: condiciones de "jsonb" a "text"
ALTER TABLE "relaciones_empresas" ALTER COLUMN "condiciones" TYPE text USING "condiciones"::text;

-- ── roles_empresa ──
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "tipo_ecosistema_id" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "activo" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "tipo_empresa" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "updated_at" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "nombre_rol" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "es_sistema" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "icono" CASCADE;
ALTER TABLE "roles_empresa" DROP COLUMN IF EXISTS "color" CASCADE;
-- Cambiar tipo: id de "uuid" a "integer" (solo si actualmente es uuid)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='roles_empresa' 
      AND column_name='id' AND data_type='uuid'
  ) THEN
    -- Primero crear la secuencia si no existe
    CREATE SEQUENCE IF NOT EXISTS roles_empresa_id_seq;
    -- Recrear la columna (casting uuid a int no es posible directo)
    ALTER TABLE "roles_empresa" ADD COLUMN "id_new" integer DEFAULT nextval('roles_empresa_id_seq'::regclass);
    UPDATE "roles_empresa" SET "id_new" = nextval('roles_empresa_id_seq'::regclass) WHERE "id_new" IS NULL;
    ALTER TABLE "roles_empresa" DROP COLUMN "id" CASCADE;
    ALTER TABLE "roles_empresa" RENAME COLUMN "id_new" TO "id";
    ALTER TABLE "roles_empresa" ALTER COLUMN "id" SET NOT NULL;
    ALTER TABLE "roles_empresa" ADD PRIMARY KEY ("id");
  ELSE
    ALTER TABLE "roles_empresa" ALTER COLUMN "id" SET DEFAULT nextval('roles_empresa_id_seq'::regclass);
  END IF;
END $$;
-- Cambiar tipo: nombre de "varchar(100)" a "text"
ALTER TABLE "roles_empresa" ALTER COLUMN "nombre" TYPE text USING "nombre"::text;
-- Agregar NOT NULL (verificar que no haya NULLs primero)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "roles_empresa" WHERE "nombre" IS NULL LIMIT 1) THEN
    ALTER TABLE "roles_empresa" ALTER COLUMN "nombre" SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on roles_empresa.nombre: contains NULL values';
  END IF;
END $$;
ALTER TABLE "roles_empresa" ALTER COLUMN "created_at" SET DEFAULT now();

-- ── super_admins ──
-- Cambiar tipo: email de "varchar(255)" a "varchar"
ALTER TABLE "super_admins" ALTER COLUMN "email" TYPE character varying USING "email"::character varying;
-- Cambiar tipo: nombre_completo de "varchar(255)" a "varchar"
ALTER TABLE "super_admins" ALTER COLUMN "nombre_completo" TYPE character varying USING "nombre_completo"::character varying;
ALTER TABLE "super_admins" ALTER COLUMN "permisos" SET DEFAULT '{"all": true}'::jsonb;

-- ── ubicaciones ──
ALTER TABLE "ubicaciones" ADD COLUMN IF NOT EXISTS "localidad" text;
ALTER TABLE "ubicaciones" ADD COLUMN IF NOT EXISTS "activa" boolean DEFAULT true;
-- Cambiar tipo: nombre de "varchar(255)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "nombre" TYPE text USING "nombre"::text;
-- Cambiar tipo: tipo de "varchar(50)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "tipo" TYPE text USING "tipo"::text;
ALTER TABLE "ubicaciones" ALTER COLUMN "direccion" DROP NOT NULL;
-- Cambiar tipo: provincia de "varchar(100)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "provincia" TYPE text USING "provincia"::text;
-- Cambiar tipo: codigo_postal de "varchar(10)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "codigo_postal" TYPE text USING "codigo_postal"::text;
ALTER TABLE "ubicaciones" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "ubicaciones" ALTER COLUMN "updated_at" SET DEFAULT now();
-- Cambiar tipo: cuit de "varchar(13)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "cuit" TYPE text USING "cuit"::text;
ALTER TABLE "ubicaciones" ALTER COLUMN "cuit" DROP NOT NULL;
-- Cambiar tipo: ciudad de "varchar(100)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "ciudad" TYPE text USING "ciudad"::text;
-- Cambiar tipo: pais de "varchar(100)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "pais" TYPE text USING "pais"::text;
ALTER TABLE "ubicaciones" ALTER COLUMN "pais" SET DEFAULT 'Argentina'::text;
-- Cambiar tipo: telefono de "varchar(50)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "telefono" TYPE text USING "telefono"::text;
-- Cambiar tipo: email de "varchar(255)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "email" TYPE text USING "email"::text;
-- Cambiar tipo: contacto_nombre de "varchar(255)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "contacto_nombre" TYPE text USING "contacto_nombre"::text;
-- Cambiar tipo: contacto_cargo de "varchar(100)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "contacto_cargo" TYPE text USING "contacto_cargo"::text;
-- Cambiar tipo: capacidad_carga de "varchar(100)" a "text"
ALTER TABLE "ubicaciones" ALTER COLUMN "capacidad_carga" TYPE text USING "capacidad_carga"::text;

-- ── ubicaciones_choferes ──
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "viaje_id" DROP NOT NULL;
-- Cambiar tipo: latitude de "double precision" a "numeric(10,8)"
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "latitude" TYPE numeric(10,8) USING "latitude"::numeric(10,8);
-- Cambiar tipo: longitude de "double precision" a "numeric(11,8)"
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "longitude" TYPE numeric(11,8) USING "longitude"::numeric(11,8);
-- Cambiar tipo: accuracy de "double precision" a "numeric(10,2)"
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "accuracy" TYPE numeric(10,2) USING "accuracy"::numeric(10,2);
-- Cambiar tipo: altitude de "double precision" a "numeric(10,2)"
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "altitude" TYPE numeric(10,2) USING "altitude"::numeric(10,2);
-- Cambiar tipo: velocidad de "double precision" a "numeric(6,2)"
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "velocidad" TYPE numeric(6,2) USING "velocidad"::numeric(6,2);
-- Cambiar tipo: heading de "double precision" a "numeric(5,2)"
ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "heading" TYPE numeric(5,2) USING "heading"::numeric(5,2);
-- Agregar NOT NULL (verificar que no haya NULLs primero)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ubicaciones_choferes" WHERE "created_at" IS NULL LIMIT 1) THEN
    ALTER TABLE "ubicaciones_choferes" ALTER COLUMN "created_at" SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on ubicaciones_choferes.created_at: contains NULL values';
  END IF;
END $$;

-- ── usuarios ──
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "password" CASCADE;
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "rol" CASCADE;
ALTER TABLE "usuarios" ALTER COLUMN "id" DROP DEFAULT;

-- ── usuarios_empresa ──
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "rol_id" integer;
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "nombre" text;
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "apellido" text;
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "telefono" text;
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE "usuarios_empresa" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
-- Agregar NOT NULL (verificar que no haya NULLs primero)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "usuarios_empresa" WHERE "user_id" IS NULL LIMIT 1) THEN
    ALTER TABLE "usuarios_empresa" ALTER COLUMN "user_id" SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on usuarios_empresa.user_id: contains NULL values';
  END IF;
END $$;
-- Agregar NOT NULL (verificar que no haya NULLs primero)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "usuarios_empresa" WHERE "empresa_id" IS NULL LIMIT 1) THEN
    ALTER TABLE "usuarios_empresa" ALTER COLUMN "empresa_id" SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on usuarios_empresa.empresa_id: contains NULL values';
  END IF;
END $$;
ALTER TABLE "usuarios_empresa" ALTER COLUMN "rol_interno" DROP NOT NULL;
ALTER TABLE "usuarios_empresa" ALTER COLUMN "fecha_vinculacion" DROP DEFAULT;
ALTER TABLE "usuarios_empresa" ALTER COLUMN "fecha_asignacion" DROP DEFAULT;
ALTER TABLE "usuarios_empresa" ALTER COLUMN "configuracion_usuario" DROP DEFAULT;

-- ── viajes_despacho ──
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "codigo" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "origen" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "destino" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "cantidad" numeric;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "unidad" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "tipo_carga" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "tipo_unidad" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "fecha_carga" date;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "hora_carga_desde" time without time zone;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "hora_carga_hasta" time without time zone;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "fecha_entrega" date;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "fecha_descarga" date;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "hora_descarga" time without time zone;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "prioridad" text DEFAULT 'normal'::text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "tipo" text DEFAULT 'normal'::text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "origen_id" uuid;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "destino_id" uuid;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "origen_lat" numeric;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "origen_lng" numeric;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "destino_lat" numeric;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "destino_lng" numeric;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "estado_tracking" text DEFAULT 'sin_iniciar'::text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "created_by" uuid;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "fecha_sal_del_cliente" timestamp with time zone;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "remito_nro" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "carta_porte" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "observaciones_transporte" text;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "merge_transporte_asignado_old" uuid;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "camion_sin_registrar_info" jsonb;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "acoplado_sin_registrar_info" jsonb;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "chofer_sin_registrar_info" jsonb;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "fecha_expiracion" timestamp with time zone;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "transportes_id" uuid;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "fecha_expirado" timestamp with time zone;
ALTER TABLE "viajes_despacho" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "fecha_llamado_carga" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "fecha_salida_planta" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "peso_estimado" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "unidad_medida" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "remito_numero" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "remito_url" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "carta_porte_url" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "fotos_carga" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "notas_internas" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "asignado_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "camion_asignado_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "confirmado_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "ingreso_registrado_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "carga_supervisada_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "salida_registrada_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "entrega_confirmada_por" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "qr_code" CASCADE;
ALTER TABLE "viajes_despacho" DROP COLUMN IF EXISTS "tipo_operacion" CASCADE;
ALTER TABLE "viajes_despacho" ALTER COLUMN "despacho_id" DROP NOT NULL;
ALTER TABLE "viajes_despacho" ALTER COLUMN "numero_viaje" DROP NOT NULL;
ALTER TABLE "viajes_despacho" ALTER COLUMN "estado" SET DEFAULT 'pendiente_transporte'::text;
ALTER TABLE "viajes_despacho" ALTER COLUMN "estado_carga" DROP NOT NULL;
ALTER TABLE "viajes_despacho" ALTER COLUMN "estado_carga" SET DEFAULT 'pendiente'::text;
-- Cambiar tipo: peso_real de "numeric(10,2)" a "numeric"
ALTER TABLE "viajes_despacho" ALTER COLUMN "peso_real" TYPE numeric USING "peso_real"::numeric;

-- ── Crear índices que dependen de columnas nuevas ──────────
CREATE INDEX IF NOT EXISTS idx_acoplados_deleted_at ON public.acoplados USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_acoplados_patente_empresa_unique ON public.acoplados USING btree (patente, empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_camiones_deleted_at ON public.camiones USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_camiones_patente_empresa_unique ON public.camiones USING btree (patente, empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_choferes_deleted_at ON public.choferes USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_choferes_dni_empresa_unique ON public.choferes USING btree (dni, empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_despachos_deleted_at ON public.despachos USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_despachos_fecha ON public.despachos USING btree (fecha_programada);
CREATE INDEX IF NOT EXISTS idx_despachos_referencia_cliente ON public.despachos USING btree (referencia_cliente) WHERE (referencia_cliente IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_empresas_deleted_at ON public.empresas USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_fecha ON public.incidencias_viaje USING btree (fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_relaciones_empresas_deleted_at ON public.relaciones_empresas USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON public.usuarios USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_deleted_at ON public.usuarios_empresa USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_deleted_at ON public.viajes_despacho USING btree (deleted_at) WHERE (deleted_at IS NULL);


-- ── Resultado ────────────────────────────────────────────
-- Migración 070: eliminados: 95, creados: 70, modificados: 55
DO $$ BEGIN
  RAISE NOTICE '✅ Migración 070 completada: eliminados: 95, creados: 70, modificados: 55';
END $$;
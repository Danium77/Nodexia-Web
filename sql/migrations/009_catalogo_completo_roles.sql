-- =============================================
-- CATÁLOGO COMPLETO DE ROLES POR TIPO EMPRESA
-- Parametrización total de roles
-- =============================================

-- Eliminar roles anteriores si existen
DELETE FROM public.roles_empresa;

-- ═══════════════════════════════════════════════
-- TIPO: SISTEMA (Nodexia)
-- ═══════════════════════════════════════════════
INSERT INTO public.roles_empresa (nombre_rol, descripcion, tipo_empresa, permisos, activo)
VALUES 
    ('administrador', 'Administrador con acceso total al sistema', 'sistema', 
     '{
        "gestionar_usuarios": true,
        "gestionar_empresas": true,
        "gestionar_solicitudes": true,
        "ver_reportes_globales": true,
        "configurar_sistema": true,
        "gestionar_red_nodexia": true,
        "ver_todas_transacciones": true,
        "gestionar_roles": true
     }'::jsonb, 
     true),
    ('administrativo', 'Administrativo con permisos limitados', 'sistema', 
     '{
        "gestionar_solicitudes": true,
        "ver_reportes_globales": true,
        "ver_empresas": true,
        "ver_usuarios": true
     }'::jsonb, 
     true);

-- ═══════════════════════════════════════════════
-- TIPO: PLANTA
-- ═══════════════════════════════════════════════
INSERT INTO public.roles_empresa (nombre_rol, descripcion, tipo_empresa, permisos, activo)
VALUES 
    ('coordinador_planta', 'Coordinador de planta - Gestión completa', 'planta', 
     '{
        "crear_despachos": true,
        "editar_despachos": true,
        "cancelar_despachos": true,
        "ver_despachos": true,
        "gestionar_transportes": true,
        "gestionar_origenes": true,
        "gestionar_destinos": true,
        "publicar_red_nodexia": true,
        "ver_estadisticas": true,
        "gestionar_usuarios_planta": true
     }'::jsonb, 
     true),
    ('control_acceso', 'Control de acceso - Registro de ingresos/salidas', 'planta', 
     '{
        "ver_despachos": true,
        "registrar_ingreso_camion": true,
        "registrar_salida_camion": true,
        "ver_camiones_en_planta": true,
        "escanear_qr": true
     }'::jsonb, 
     true),
    ('supervisor_carga', 'Supervisor de carga - Control de carga/descarga', 'planta', 
     '{
        "ver_despachos": true,
        "iniciar_carga": true,
        "finalizar_carga": true,
        "registrar_incidencias": true,
        "ver_estado_carga": true
     }'::jsonb, 
     true);

-- ═══════════════════════════════════════════════
-- TIPO: TRANSPORTE
-- ═══════════════════════════════════════════════
INSERT INTO public.roles_empresa (nombre_rol, descripcion, tipo_empresa, permisos, activo)
VALUES 
    ('coordinador_transporte', 'Coordinador de transporte - Gestión completa', 'transporte', 
     '{
        "ver_despachos_asignados": true,
        "asignar_choferes": true,
        "asignar_camiones": true,
        "ver_red_nodexia": true,
        "tomar_ofertas": true,
        "ver_estadisticas": true,
        "gestionar_flota": true,
        "gestionar_choferes": true,
        "gestionar_usuarios_transporte": true
     }'::jsonb, 
     true),
    ('administrativo', 'Administrativo transporte - Gestión administrativa', 'transporte', 
     '{
        "ver_despachos_asignados": true,
        "ver_estadisticas": true,
        "ver_flota": true,
        "ver_choferes": true,
        "generar_reportes": true
     }'::jsonb, 
     true);

-- ═══════════════════════════════════════════════
-- TIPO: CLIENTE
-- ═══════════════════════════════════════════════
INSERT INTO public.roles_empresa (nombre_rol, descripcion, tipo_empresa, permisos, activo)
VALUES 
    ('visor', 'Visor cliente - Solo lectura de envíos', 'cliente', 
     '{
        "ver_despachos_propios": true,
        "ver_estado_envio": true,
        "ver_tracking": true,
        "ver_historial": true
     }'::jsonb, 
     true);

-- ═══════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════
DO $$
DECLARE
    v_total_roles INTEGER;
    v_roles_sistema INTEGER;
    v_roles_planta INTEGER;
    v_roles_transporte INTEGER;
    v_roles_cliente INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_roles FROM public.roles_empresa;
    SELECT COUNT(*) INTO v_roles_sistema FROM public.roles_empresa WHERE tipo_empresa = 'sistema';
    SELECT COUNT(*) INTO v_roles_planta FROM public.roles_empresa WHERE tipo_empresa = 'planta';
    SELECT COUNT(*) INTO v_roles_transporte FROM public.roles_empresa WHERE tipo_empresa = 'transporte';
    SELECT COUNT(*) INTO v_roles_cliente FROM public.roles_empresa WHERE tipo_empresa = 'cliente';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ CATÁLOGO DE ROLES CREADO';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TOTAL DE ROLES: %', v_total_roles;
    RAISE NOTICE '';
    RAISE NOTICE '🏢 SISTEMA (Nodexia): % roles', v_roles_sistema;
    RAISE NOTICE '   • administrador';
    RAISE NOTICE '   • administrativo';
    RAISE NOTICE '';
    RAISE NOTICE '🏭 PLANTA: % roles', v_roles_planta;
    RAISE NOTICE '   • coordinador_planta';
    RAISE NOTICE '   • control_acceso';
    RAISE NOTICE '   • supervisor_carga';
    RAISE NOTICE '';
    RAISE NOTICE '🚚 TRANSPORTE: % roles', v_roles_transporte;
    RAISE NOTICE '   • coordinador_transporte';
    RAISE NOTICE '   • administrativo';
    RAISE NOTICE '';
    RAISE NOTICE '👤 CLIENTE: % roles', v_roles_cliente;
    RAISE NOTICE '   • visor';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- Mostrar todos los roles creados
SELECT 
    tipo_empresa,
    nombre_rol,
    descripcion,
    activo
FROM public.roles_empresa
ORDER BY 
    CASE tipo_empresa
        WHEN 'sistema' THEN 1
        WHEN 'planta' THEN 2
        WHEN 'transporte' THEN 3
        WHEN 'cliente' THEN 4
    END,
    nombre_rol;

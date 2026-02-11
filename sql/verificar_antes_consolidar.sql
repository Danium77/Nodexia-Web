-- ============================================================================
-- PRE-VERIFICACIÓN: Qué se va a consolidar
-- ============================================================================
-- Ejecuta este script ANTES de consolidar para ver qué datos se migrarán
-- ============================================================================

-- 1. Ver todos los duplicados de Transporte Nodexia
SELECT 
    '📋 Empresas duplicadas que se consolidarán' as info,
    id as uuid,
    nombre,
    cuit,
    created_at,
    CASE 
        WHEN id = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8' THEN '✅ MAESTRO (se mantiene)'
        ELSE '❌ Se eliminará'
    END as accion
FROM empresas
WHERE cuit = '20-28848617-5'
ORDER BY 
    CASE WHEN id = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8' THEN 0 ELSE 1 END,
    created_at;

-- 2. Viajes que se migrarán
SELECT 
    '📦 Viajes a migrar' as info,
    COUNT(*) as total_viajes,
    id_transporte,
    e.nombre as empresa_nombre
FROM viajes_despacho vd
LEFT JOIN empresas e ON vd.id_transporte = e.id
WHERE vd.id_transporte IN (
    SELECT id FROM empresas WHERE cuit = '20-28848617-5'
)
AND vd.id_transporte != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8'
GROUP BY id_transporte, e.nombre;

-- 3. Relaciones que se migrarán
SELECT 
    '🔗 Relaciones a migrar' as info,
    COUNT(*) as total_relaciones,
    empresa_transporte_id,
    e.nombre as empresa_nombre
FROM relaciones_empresas re
LEFT JOIN empresas e ON re.empresa_transporte_id = e.id
WHERE re.empresa_transporte_id IN (
    SELECT id FROM empresas WHERE cuit = '20-28848617-5'
)
AND re.empresa_transporte_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8'
GROUP BY empresa_transporte_id, e.nombre;

-- 4. Usuarios que se migrarán
SELECT 
    '👥 Usuarios a migrar' as info,
    COUNT(*) as total_usuarios,
    ue.empresa_id,
    e.nombre as empresa_nombre,
    ARRAY_AGG(u.email) as emails
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
LEFT JOIN usuarios u ON ue.user_id = u.id
WHERE ue.empresa_id IN (
    SELECT id FROM empresas WHERE cuit = '20-28848617-5'
)
AND ue.empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8'
GROUP BY ue.empresa_id, e.nombre;

-- 5. Recursos (choferes, camiones, acoplados) que se migrarán
SELECT 
    '🚗 Choferes a migrar' as info,
    COUNT(*) as total,
    empresa_id
FROM choferes
WHERE empresa_id IN (
    SELECT id FROM empresas WHERE cuit = '20-28848617-5'
)
AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8'
GROUP BY empresa_id;

SELECT 
    '🚛 Camiones a migrar' as info,
    COUNT(*) as total,
    empresa_id
FROM camiones
WHERE empresa_id IN (
    SELECT id FROM empresas WHERE cuit = '20-28848617-5'
)
AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8'
GROUP BY empresa_id;

SELECT 
    '🚛 Acoplados a migrar' as info,
    COUNT(*) as total,
    empresa_id
FROM acoplados
WHERE empresa_id IN (
    SELECT id FROM empresas WHERE cuit = '20-28848617-5'
)
AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8'
GROUP BY empresa_id;

-- RESUMEN TOTAL
SELECT 
    '═══════════════════════════════════════' as separador,
    '📊 RESUMEN DE CONSOLIDACIÓN' as titulo;

SELECT 
    'Total registros a migrar:' as metrica,
    (SELECT COUNT(*) FROM viajes_despacho WHERE id_transporte IN (SELECT id FROM empresas WHERE cuit = '20-28848617-5') AND id_transporte != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8') as viajes,
    (SELECT COUNT(*) FROM relaciones_empresas WHERE empresa_transporte_id IN (SELECT id FROM empresas WHERE cuit = '20-28848617-5') AND empresa_transporte_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8') as relaciones,
    (SELECT COUNT(*) FROM usuarios_empresa WHERE empresa_id IN (SELECT id FROM empresas WHERE cuit = '20-28848617-5') AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8') as usuarios,
    (SELECT COUNT(*) FROM choferes WHERE empresa_id IN (SELECT id FROM empresas WHERE cuit = '20-28848617-5') AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8') as choferes,
    (SELECT COUNT(*) FROM camiones WHERE empresa_id IN (SELECT id FROM empresas WHERE cuit = '20-28848617-5') AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8') as camiones,
    (SELECT COUNT(*) FROM acoplados WHERE empresa_id IN (SELECT id FROM empresas WHERE cuit = '20-28848617-5') AND empresa_id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8') as acoplados;

SELECT 
    '✅ UUID Maestro (se mantiene):' as info,
    'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8' as uuid,
    nombre,
    cuit
FROM empresas
WHERE id = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';

SELECT 
    '❌ Empresas duplicadas (se eliminarán):' as info,
    COUNT(*) as cantidad
FROM empresas
WHERE cuit = '20-28848617-5'
AND id != 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';

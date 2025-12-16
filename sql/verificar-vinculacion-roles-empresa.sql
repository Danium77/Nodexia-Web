-- ================================================
-- VERIFICACIÓN: Vinculación de Roles por Empresa
-- ================================================
-- Ejecutar en Supabase SQL Editor para verificar
-- que los usuarios están correctamente vinculados

-- 1. VERIFICAR USUARIOS DE ACEITERA SAN MIGUEL
-- =============================================
SELECT 
  '1. USUARIOS ACEITERA SAN MIGUEL' as seccion,
  u.email,
  ue.rol_interno,
  ue.empresa_id,
  e.nombre as empresa_nombre,
  e.tipo_empresa,
  ue.activo
FROM usuarios u
JOIN usuarios_empresa ue ON u.id = ue.user_id
JOIN empresas e ON ue.empresa_id = e.id
WHERE e.nombre ILIKE '%aceitera%san miguel%'
ORDER BY ue.rol_interno;

-- RESULTADO ESPERADO:
-- coordinador@anmiguel.com.ar | coordinador | 3cc1979e-... | Aceitera San Miguel S.A | planta | true
-- porteria2@anmiguel.com.ar | Control de Acceso | 3cc1979e-... | Aceitera San Miguel S.A | planta | true
-- supervisor@anmiguel.com.ar | Supervisor de Carga | 3cc1979e-... | Aceitera San Miguel S.A | planta | true


-- 2. VERIFICAR QUE TODOS TIENEN LA MISMA EMPRESA
-- =============================================
SELECT 
  '2. VERIFICACION EMPRESA COMUN' as seccion,
  empresa_id,
  COUNT(*) as cantidad_usuarios,
  array_agg(rol_interno) as roles_presentes
FROM usuarios_empresa ue
JOIN empresas e ON ue.empresa_id = e.id
WHERE e.nombre ILIKE '%aceitera%san miguel%'
GROUP BY empresa_id;

-- RESULTADO ESPERADO:
-- 3cc1979e-1672-48b8-a5e5-2675f5cac527 | 3 | {coordinador, "Control de Acceso", "Supervisor de Carga"}


-- 3. VERIFICAR VIAJES EXISTENTES DE ACEITERA SAN MIGUEL
-- =============================================
SELECT 
  '3. VIAJES ACEITERA SAN MIGUEL' as seccion,
  v.numero_viaje,
  v.estado,
  d.producto,
  d.origen,
  d.destino,
  eu.estado_unidad,
  ec.estado_carga,
  v.created_at
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN estado_unidad_viaje eu ON v.id = eu.viaje_id
LEFT JOIN estado_carga_viaje ec ON v.id = ec.viaje_id
WHERE d.id_empresa = '3cc1979e-1672-48b8-a5e5-2675f5cac527'
ORDER BY v.created_at DESC
LIMIT 10;

-- Si no hay viajes, el resultado estará vacío (es normal)


-- 4. VERIFICAR ROLES DISPONIBLES PARA TIPO "PLANTA"
-- =============================================
SELECT 
  '4. ROLES DISPONIBLES PARA PLANTA' as seccion,
  id,
  nombre_rol,
  tipo_empresa,
  activo
FROM roles_empresa
WHERE (tipo_empresa = 'planta' OR tipo_empresa = 'ambos')
  AND activo = true
ORDER BY nombre_rol;

-- RESULTADO ESPERADO debe incluir:
-- Control de Acceso | ambos | true
-- Supervisor de Carga | planta | true
-- coordinador | ambos | true


-- 5. VERIFICAR CONFIGURACIÓN DE USUARIOS (auth.users)
-- =============================================
SELECT 
  '5. USUARIOS EN AUTH' as seccion,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmado,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email IN (
  'coordinador@anmiguel.com.ar',
  'porteria2@anmiguel.com.ar',
  'supervisor@anmiguel.com.ar'
)
ORDER BY email;


-- 6. VERIFICAR ROW LEVEL SECURITY (RLS)
-- =============================================
SELECT 
  '6. ESTADO RLS TABLAS CRITICAS' as seccion,
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'viajes_despacho',
    'despachos',
    'usuarios_empresa',
    'empresas'
  )
ORDER BY tablename;

-- NOTA: Si rls_habilitado = false, entonces NO hay restricciones RLS


-- 7. VERIFICAR POLÍTICAS RLS ACTIVAS
-- =============================================
SELECT 
  '7. POLITICAS RLS' as seccion,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operacion
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'viajes_despacho',
    'despachos',
    'usuarios_empresa'
  )
ORDER BY tablename, policyname;

-- Si no hay resultados, significa que no hay políticas RLS activas


-- 8. TEST: SIMULAR QUERY DE CONTROL DE ACCESO
-- =============================================
-- Esta query es la que ejecuta Control de Acceso
-- para buscar viajes. Debería retornar viajes de
-- Aceitera San Miguel.

WITH empresa_usuario AS (
  -- Simular empresaId del usuario Control de Acceso
  SELECT empresa_id 
  FROM usuarios_empresa 
  WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'porteria2@anmiguel.com.ar'
  )
  LIMIT 1
)
SELECT 
  '8. TEST QUERY CONTROL ACCESO' as seccion,
  v.numero_viaje,
  v.id as viaje_id,
  d.producto,
  d.id_empresa,
  CASE 
    WHEN d.id_empresa = (SELECT empresa_id FROM empresa_usuario)
    THEN 'ENVIO'
    ELSE 'RECEPCION'
  END as tipo_operacion
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE d.id_empresa = (SELECT empresa_id FROM empresa_usuario)
LIMIT 5;

-- Si retorna viajes, significa que la vinculación funciona


-- 9. TEST: SIMULAR QUERY DE SUPERVISOR DE CARGA
-- =============================================
WITH empresa_usuario AS (
  SELECT empresa_id 
  FROM usuarios_empresa 
  WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'supervisor@anmiguel.com.ar'
  )
  LIMIT 1
)
SELECT 
  '9. TEST QUERY SUPERVISOR CARGA' as seccion,
  v.numero_viaje,
  d.producto,
  eu.estado_unidad,
  ec.estado_carga
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN estado_unidad_viaje eu ON v.id = eu.viaje_id
LEFT JOIN estado_carga_viaje ec ON v.id = ec.viaje_id
WHERE d.id_empresa = (SELECT empresa_id FROM empresa_usuario)
  AND eu.estado_unidad IN ('ingreso_planta', 'en_playa_espera', 'en_proceso_carga')
LIMIT 5;


-- 10. RESUMEN FINAL
-- =============================================
SELECT 
  '10. RESUMEN' as seccion,
  (
    SELECT COUNT(*) 
    FROM usuarios_empresa ue
    JOIN empresas e ON ue.empresa_id = e.id
    WHERE e.nombre ILIKE '%aceitera%san miguel%'
  ) as usuarios_aceitera,
  (
    SELECT COUNT(*) 
    FROM viajes_despacho v
    JOIN despachos d ON v.despacho_id = d.id
    WHERE d.id_empresa = '3cc1979e-1672-48b8-a5e5-2675f5cac527'
  ) as viajes_aceitera,
  (
    SELECT COUNT(*) 
    FROM roles_empresa
    WHERE (tipo_empresa = 'planta' OR tipo_empresa = 'ambos')
      AND activo = true
  ) as roles_disponibles_planta;

-- RESULTADO ESPERADO:
-- usuarios_aceitera: 3
-- viajes_aceitera: 0 o más (depende si hay viajes creados)
-- roles_disponibles_planta: 5 o más


-- ================================================
-- INSTRUCCIONES DE USO
-- ================================================
/*
1. Copiar todo este script
2. Ir a Supabase > SQL Editor
3. Pegar y ejecutar
4. Revisar resultados en cada sección

INTERPRETACIÓN:
- Sección 1-2: Verificar que los 3 usuarios existen con misma empresa
- Sección 3: Ver si hay viajes para probar
- Sección 4: Confirmar que roles existen
- Sección 5: Verificar usuarios en auth
- Sección 6-7: Ver estado de RLS (opcional)
- Sección 8-9: Tests de queries reales
- Sección 10: Resumen

SI FALTA ALGÚN USUARIO:
- Usar API /api/admin/nueva-invitacion para crear
- O crear manualmente con script crear-usuario-*.ps1
*/

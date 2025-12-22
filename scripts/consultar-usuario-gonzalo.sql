-- Script para diagnosticar usuario gonzalo
-- Fecha: 21-Dic-2025
-- Problema: Coordinador de transporte ve interfaz de planta

-- 1. Ver usuario gonzalo en auth
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email ILIKE '%gonzalo%';

-- 2. Ver relaciones usuarios_empresa de gonzalo
SELECT 
  ue.id,
  ue.user_id,
  ue.empresa_id,
  ue.rol_interno,
  ue.activo,
  ue.nombre_completo,
  e.nombre AS empresa_nombre,
  e.tipo_empresa,
  e.cuit
FROM usuarios_empresa ue
LEFT JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%gonzalo%'
)
ORDER BY ue.activo DESC, e.nombre;

-- 3. Ver empresas del tipo transporte
SELECT 
  id,
  nombre,
  tipo_empresa,
  cuit,
  activo
FROM empresas
WHERE tipo_empresa = 'transporte'
ORDER BY nombre;

-- 4. Ver roles disponibles en roles_empresa
SELECT 
  id,
  nombre_rol,
  descripcion,
  tipo_empresa,
  activo,
  es_sistema
FROM roles_empresa
WHERE activo = true
ORDER BY es_sistema DESC, nombre_rol;

-- 5. Verificar viajes del usuario gonzalo
SELECT 
  v.id,
  v.codigo_viaje,
  v.estado_unidad,
  v.transporte_id,
  t.razon_social AS transporte_nombre,
  v.chofer_id,
  ch.nombre AS chofer_nombre
FROM viajes v
LEFT JOIN empresas t ON t.id = v.transporte_id
LEFT JOIN usuarios_empresa ch ON ch.id = v.chofer_id
WHERE v.transporte_id IN (
  SELECT empresa_id 
  FROM usuarios_empresa 
  WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%gonzalo%')
)
ORDER BY v.id DESC
LIMIT 10;

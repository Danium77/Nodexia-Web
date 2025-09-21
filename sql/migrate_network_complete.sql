-- Script de migración completo con datos de ejemplo
-- Ejecutar en orden: primero estructura, luego políticas, luego funciones, luego datos

-- 1. Crear estructura
\i create_network_structure.sql;

-- 2. Crear políticas RLS  
\i create_network_rls_policies.sql;

-- 3. Crear funciones
\i create_network_functions.sql;

-- 4. Datos de ejemplo

-- Insertar empresas de ejemplo
INSERT INTO public.empresas (id, nombre, cuit, tipo_empresa, email, telefono, direccion, activa, usuario_admin) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Nodexia Transporte Demo', 
  '20-12345678-9', 
  'transporte',
  'demo@nodexia.com',
  '+54 11 1234-5678',
  'Av. Corrientes 1234, CABA',
  true,
  (SELECT id FROM auth.users WHERE email = 'transporte.demo@nodexia.com' LIMIT 1)
),
(
  '22222222-2222-2222-2222-222222222222',
  'Empresa Coordinadora ABC',
  '20-87654321-0',
  'coordinador', 
  'coordinador@abc.com',
  '+54 11 8765-4321',
  'San Martín 567, Buenos Aires',
  true,
  (SELECT id FROM auth.users WHERE email = 'coordinador@abc.com' LIMIT 1)
),
(
  '33333333-3333-3333-3333-333333333333',
  'Transportes XYZ S.A.',
  '30-11223344-5',
  'transporte',
  'admin@transportesxyz.com',
  '+54 11 2233-4455',
  'Ruta 9 Km 45, La Plata',
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@transportesxyz.com' LIMIT 1)
);

-- Insertar usuarios de empresas (asociaciones usuario-empresa)
INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, nombre_completo, email_interno, departamento, activo) VALUES
-- Usuario demo de transporte
(
  (SELECT id FROM auth.users WHERE email = 'transporte.demo@nodexia.com' LIMIT 1),
  '11111111-1111-1111-1111-111111111111',
  'admin',
  'Administrador Demo Transporte',
  'admin@nodexia-transporte.com',
  'Administración',
  true
),
-- Usuario coordinador
(
  (SELECT id FROM auth.users WHERE email = 'coordinador@abc.com' LIMIT 1), 
  '22222222-2222-2222-2222-222222222222',
  'admin',
  'Administrador ABC',
  'admin@abc.com',
  'Administración',
  true
),
-- Usuario admin de XYZ
(
  (SELECT id FROM auth.users WHERE email = 'admin@transportesxyz.com' LIMIT 1),
  '33333333-3333-3333-3333-333333333333', 
  'admin',
  'Admin XYZ Transportes',
  'admin@transportesxyz.com',
  'Administración',
  true
)
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- Agregar usuarios adicionales de ejemplo para demostrar múltiples usuarios por empresa
-- (Estos usuarios no existen realmente en auth.users, solo para estructura)

-- Insertar algunos usuarios adicionales de ejemplo para la empresa coordinadora
INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, nombre_completo, email_interno, departamento, activo) VALUES
-- Usuarios para empresa coordinadora ABC (usando UUID ficticios)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  'coordinador',
  'María González',
  'maria.gonzalez@abc.com',
  'Operaciones',
  true
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'control_acceso',
  'Carlos Ruiz',
  'carlos.ruiz@abc.com',
  'Seguridad',
  true
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  'supervisor_carga',
  'Ana Martínez',
  'ana.martinez@abc.com',
  'Operaciones',
  true
),

-- Usuarios para empresa de transporte Nodexia
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'coordinador',
  'José García',
  'jose.garcia@nodexia.com',
  'Flota',
  true
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'chofer',
  'Luis Fernández',
  'luis.fernandez@nodexia.com',
  'Operaciones',
  true
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'administrativo',
  'Elena López',
  'elena.lopez@nodexia.com',
  'Administración',
  true
),

-- Usuarios para empresa de transporte XYZ
(
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  '33333333-3333-3333-3333-333333333333',
  'coordinador',
  'Pedro Sánchez',
  'pedro.sanchez@transportesxyz.com',
  'Flota',
  true
),
(
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  '33333333-3333-3333-3333-333333333333',
  'chofer',
  'Roberto Torres',
  'roberto.torres@transportesxyz.com',
  'Operaciones',
  true
)
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- Crear relaciones de ejemplo
INSERT INTO public.relaciones_empresas (empresa_cliente_id, empresa_transporte_id, estado, condiciones) VALUES
(
  '22222222-2222-2222-2222-222222222222', -- Coordinadora ABC como cliente
  '11111111-1111-1111-1111-111111111111', -- Nodexia Transporte como proveedor
  'activa',
  '{"tarifa_base": 150, "descuento_volumen": 10, "terminos_pago": "30 dias"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222222', -- Coordinadora ABC como cliente  
  '33333333-3333-3333-3333-333333333333', -- Transportes XYZ como proveedor
  'activa',
  '{"tarifa_base": 140, "descuento_volumen": 5, "terminos_pago": "15 dias"}'::jsonb
)
ON CONFLICT (empresa_cliente_id, empresa_transporte_id) DO NOTHING;

-- Actualizar choferes existentes para asociarlos a empresas
UPDATE public.choferes 
SET empresa_id = '11111111-1111-1111-1111-111111111111'
WHERE empresa_id IS NULL 
AND id_transporte = (SELECT id FROM auth.users WHERE email = 'transporte.demo@nodexia.com' LIMIT 1);

-- Mensaje de confirmación
SELECT 'Estructura de red de empresas creada exitosamente!' as mensaje,
       COUNT(*) as empresas_creadas
FROM public.empresas;

SELECT 'Relaciones de ejemplo creadas:' as mensaje,
       COUNT(*) as relaciones_activas  
FROM public.relaciones_empresas 
WHERE estado = 'activa';
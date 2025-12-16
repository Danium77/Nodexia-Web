-- Crear entrada en usuarios_empresa para Walter Zayas
-- Este usuario existe en auth.users pero falta en usuarios_empresa

-- Primero verificar si ya existe
DELETE FROM usuarios_empresa 
WHERE user_id = '50da5768-b203-4719-ad16-62e03e2b151a'
  AND empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';

-- Insertar el registro
INSERT INTO usuarios_empresa (
  user_id,
  empresa_id,
  rol_interno,
  activo,
  nombre_completo,
  telefono_interno,
  departamento,
  fecha_vinculacion
)
VALUES (
  '50da5768-b203-4719-ad16-62e03e2b151a',  -- user_id de Walter
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed',  -- Logística Express SRL
  'chofer',                                 -- rol
  true,                                     -- activo
  'Walter Daniel Zayas',                    -- nombre completo
  '+541127669000',                          -- teléfono
  'Operaciones',                            -- departamento
  '2025-11-23 21:12:52.924564+00'          -- fecha de creación del usuario
);

-- Verificar el resultado
SELECT 
  ue.user_id,
  ue.nombre_completo,
  ue.rol_interno,
  ue.activo,
  ue.telefono_interno,
  e.nombre as empresa_nombre,
  u.email
FROM usuarios_empresa ue
LEFT JOIN empresas e ON e.id = ue.empresa_id
LEFT JOIN auth.users u ON u.id = ue.user_id
WHERE ue.user_id = '50da5768-b203-4719-ad16-62e03e2b151a';

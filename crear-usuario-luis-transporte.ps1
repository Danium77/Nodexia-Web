# Script para crear usuario coordinador de transporte Luis
# Logistica Express SRL

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CREACION USUARIO COORDINADOR TRANSPORTE" -ForegroundColor Cyan
Write-Host "  Luis - Logistica Express SRL" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 DATOS DEL USUARIO:" -ForegroundColor Yellow
Write-Host "   Email: luis@centro.com.ar" -ForegroundColor White
Write-Host "   Nombre: Luis Martinez" -ForegroundColor White
Write-Host "   Rol: Coordinador de Transporte" -ForegroundColor White
Write-Host "   Empresa: Logística Express SRL" -ForegroundColor White
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 1: CONFIGURAR PASSWORD EN SUPABASE AUTH" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "El usuario ya existe en Auth (UID: 59371825-6099-438c-b2f9-e3ba42f3216)" -ForegroundColor Green
Write-Host ""
Write-Host "1. Ve a: Supabase Dashboard > Authentication > Users" -ForegroundColor Yellow
Write-Host "2. Busca: luis@centro.com.ar" -ForegroundColor Yellow
Write-Host "3. Click en el usuario" -ForegroundColor Yellow
Write-Host "4. Click en 'Reset password'" -ForegroundColor Yellow
Write-Host "5. Establece la contraseña: " -NoNewline -ForegroundColor Yellow
Write-Host "Luis2025!" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host "6. Marca 'Auto Confirm User' si no está confirmado" -ForegroundColor Yellow
Write-Host ""
Read-Host "Presiona ENTER cuando hayas configurado la contraseña"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 2: VERIFICAR EMPRESA LOGÍSTICA EXPRESS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta esta consulta en Supabase SQL Editor:" -ForegroundColor Green
Write-Host ""
Write-Host @"
SELECT 
  id,
  razon_social,
  nombre_comercial,
  cuit,
  tipo_empresa
FROM empresas
WHERE razon_social ILIKE '%logistica%express%'
   OR nombre_comercial ILIKE '%logistica%express%';
"@ -ForegroundColor White
Write-Host ""
Write-Host "✅ Si aparece la empresa, anota su 'id'" -ForegroundColor Green
Write-Host "❌ Si NO aparece, usa este script para crearla:" -ForegroundColor Red
Write-Host ""
Write-Host @"
INSERT INTO empresas (
  razon_social,
  nombre_comercial,
  cuit,
  tipo_empresa,
  direccion,
  telefono,
  email,
  activo
) VALUES (
  'Logística Express SRL',
  'Logística Express',
  '30-56789012-3',
  'transporte',
  'Av. Transporte 456, CABA',
  '011-5555-2222',
  'contacto@logisticaexpress.com.ar',
  true
)
RETURNING id;
"@ -ForegroundColor White
Write-Host ""
$empresa_id = Read-Host "Pega aquí el UUID de la empresa Logística Express"

if ($empresa_id -eq "") {
    Write-Host ""
    Write-Host "❌ No ingresaste el UUID de la empresa. Script cancelado." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 3: CREAR PERFIL Y VINCULAR CON EMPRESA" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta este script completo en Supabase SQL Editor:" -ForegroundColor Green
Write-Host ""

$sql_script = @'
-- Script de creación completa de usuario coordinador de transporte
-- Usuario: luis@centro.com.ar
-- Empresa: Logística Express SRL

DO $$
DECLARE
  v_user_id UUID := '59371825-6099-438c-b2f9-e3ba42f3216';
  v_empresa_id UUID := '$empresa_id';
  v_rol_id UUID;
BEGIN
  -- 1. Crear/actualizar perfil del usuario
  INSERT INTO profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'luis@centro.com.ar',
    'Luis Martinez',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RAISE NOTICE '✅ Perfil creado/actualizado';

  -- 2. Buscar/crear rol coordinador_transporte
  SELECT id INTO v_rol_id
  FROM roles_empresa
  WHERE nombre = 'coordinador_transporte'
  LIMIT 1;

  IF v_rol_id IS NULL THEN
    INSERT INTO roles_empresa (
      nombre,
      descripcion,
      permisos,
      activo
    ) VALUES (
      'coordinador_transporte',
      'Coordinador de Transporte',
      jsonb_build_object(
        'ver_despachos_asignados', true,
        'ver_red_nodexia', true,
        'tomar_ofertas', true,
        'asignar_choferes', true,
        'asignar_vehiculos', true,
        'gestionar_flota', true,
        'crear_despachos', false,
        'ver_planificacion', false
      ),
      true
    )
    RETURNING id INTO v_rol_id;
    
    RAISE NOTICE '✅ Rol coordinador_transporte creado';
  ELSE
    RAISE NOTICE '✅ Rol coordinador_transporte ya existe';
  END IF;

  -- 3. Crear entrada en tabla usuarios
  INSERT INTO usuarios (
    id,
    email,
    nombre_completo,
    rol_principal,
    empresa_id,
    activo,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'luis@centro.com.ar',
    'Luis Martinez',
    'coordinador_transporte',
    v_empresa_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    rol_principal = EXCLUDED.rol_principal,
    empresa_id = EXCLUDED.empresa_id,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  RAISE NOTICE '✅ Usuario creado/actualizado en tabla usuarios';

  -- 4. Vincular usuario con empresa y rol
  INSERT INTO usuarios_empresa (
    user_id,
    empresa_id,
    rol_empresa_id,
    activo,
    created_at
  ) VALUES (
    v_user_id,
    v_empresa_id,
    v_rol_id,
    true,
    NOW()
  )
  ON CONFLICT (user_id, empresa_id, rol_empresa_id) DO UPDATE SET
    activo = true;

  RAISE NOTICE '✅ Usuario vinculado con empresa y rol';

  -- 5. Actualizar metadata del usuario en auth.users
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_build_object(
      'full_name', 'Luis Martinez',
      'rol', 'coordinador_transporte',
      'empresa_id', v_empresa_id
    ),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Metadata actualizada en auth.users';

  -- 6. Resumen final
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ USUARIO CONFIGURADO EXITOSAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Email: luis@centro.com.ar';
  RAISE NOTICE 'Password: Luis2025!';
  RAISE NOTICE 'Rol: Coordinador de Transporte';
  RAISE NOTICE 'Empresa: Logística Express SRL';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Login: https://nodexia.vercel.app/login';
  RAISE NOTICE '📊 Dashboard: /dashboard';
  RAISE NOTICE '================================================';

END;
$$

-- Verificar la creación
SELECT 
  u.id,
  u.email,
  u.nombre_completo,
  u.rol_principal,
  e.razon_social as empresa,
  ue.activo as vinculo_activo,
  r.nombre as rol_empresa
FROM usuarios u
LEFT JOIN usuarios_empresa ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
LEFT JOIN roles_empresa r ON ue.rol_empresa_id = r.id
WHERE u.email = 'luis@centro.com.ar';
'@

# Guardar el script en un archivo
$sql_script | Out-File -FilePath ".\sql\crear-usuario-luis.sql" -Encoding UTF8

Write-Host $sql_script -ForegroundColor White
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 4: VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Script SQL guardado en: .\sql\crear-usuario-luis.sql" -ForegroundColor Green
Write-Host ""
Write-Host "Después de ejecutar el script, verifica que aparezca:" -ForegroundColor Yellow
Write-Host "   - ID del usuario" -ForegroundColor White
Write-Host "   - Email: luis@centro.com.ar" -ForegroundColor White
Write-Host "   - Rol: coordinador_transporte" -ForegroundColor White
Write-Host "   - Empresa: Logística Express SRL" -ForegroundColor White
Write-Host "   - Vínculo activo: true" -ForegroundColor White
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CREDENCIALES FINALES" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📧 Email: " -NoNewline -ForegroundColor Yellow
Write-Host "luis@centro.com.ar" -ForegroundColor Green
Write-Host "🔑 Password: " -NoNewline -ForegroundColor Yellow
Write-Host "Luis2025!" -ForegroundColor Green
Write-Host "👤 Rol: " -NoNewline -ForegroundColor Yellow
Write-Host "Coordinador de Transporte" -ForegroundColor Green
Write-Host "🏢 Empresa: " -NoNewline -ForegroundColor Yellow
Write-Host "Logística Express SRL" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Login: https://nodexia.vercel.app/login" -ForegroundColor Cyan
Write-Host "📊 Dashboard: /dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  SCRIPT COMPLETADO" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# =====================================================
# Script para crear usuario de chofer Walter Zayas
# Logística Express
# =====================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CREACIÓN DE USUARIO CHOFER - WALTER ZAYAS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 DATOS DEL CHOFER:" -ForegroundColor Yellow
Write-Host "   Nombre: Walter Zayas" -ForegroundColor White
Write-Host "   DNI: 30123456" -ForegroundColor White
Write-Host "   CUIL: 1121608941" -ForegroundColor White
Write-Host "   Empresa: Logística Express" -ForegroundColor White
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 1: VERIFICAR CHOFER EN BASE DE DATOS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta esta consulta en Supabase SQL Editor:" -ForegroundColor Green
Write-Host ""
Write-Host @"
SELECT 
  c.id as chofer_id,
  c.nombre,
  c.apellido,
  c.dni,
  c.cuil,
  c.user_id,
  c.empresa_id,
  e.razon_social as empresa
FROM choferes c
LEFT JOIN empresas e ON c.empresa_id = e.id
WHERE c.dni = '30123456' AND c.cuil = '1121608941';
"@ -ForegroundColor White
Write-Host ""
Write-Host "✅ Si aparece el chofer, anota su 'chofer_id' y 'empresa_id'" -ForegroundColor Green
Write-Host "❌ Si NO aparece, primero debes crear el chofer en la tabla choferes" -ForegroundColor Red
Write-Host ""
Read-Host "Presiona ENTER cuando hayas verificado"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 2: CREAR USUARIO EN SUPABASE DASHBOARD" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a: https://supabase.com/dashboard/project/[tu-proyecto]/auth/users" -ForegroundColor Yellow
Write-Host "2. Click en 'Add User' → 'Create new user'" -ForegroundColor Yellow
Write-Host "3. Completa los datos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Email: " -NoNewline -ForegroundColor White
Write-Host "walter.zayas@logisticaexpres.com" -ForegroundColor Green
Write-Host "   Password: " -NoNewline -ForegroundColor White
Write-Host "WalterZayas2025!" -ForegroundColor Green
Write-Host "   Auto Confirm User: " -NoNewline -ForegroundColor White
Write-Host "✅ ACTIVADO" -ForegroundColor Green
Write-Host ""
Write-Host "4. Click 'Create user'" -ForegroundColor Yellow
Write-Host "5. Una vez creado, COPIA el UUID del usuario" -ForegroundColor Yellow
Write-Host ""
$user_uuid = Read-Host "Pega aquí el UUID del usuario creado"

if ($user_uuid -eq "") {
    Write-Host ""
    Write-Host "❌ No ingresaste el UUID. Script cancelado." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 3: VINCULAR USUARIO CON CHOFER" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta este script en Supabase SQL Editor:" -ForegroundColor Green
Write-Host ""

$sql_script = @"
-- Vincular usuario con chofer Walter Zayas
DO `$`$
DECLARE
  v_user_id UUID := '$user_uuid';
  v_chofer_id UUID;
  v_empresa_id UUID;
BEGIN
  -- Buscar el chofer
  SELECT id, empresa_id INTO v_chofer_id, v_empresa_id
  FROM choferes
  WHERE dni = '30123456' AND cuil = '1121608941';
  
  IF v_chofer_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el chofer';
  END IF;
  
  -- Crear perfil del usuario
  INSERT INTO profiles (
    id,
    email,
    full_name,
    rol_primario,
    empresa_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'walter.zayas@logisticaexpres.com',
    'Walter Zayas',
    'chofer',
    v_empresa_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    rol_primario = 'chofer',
    empresa_id = v_empresa_id,
    updated_at = NOW();
  
  -- Asociar el usuario con el chofer
  UPDATE choferes
  SET 
    user_id = v_user_id,
    updated_at = NOW()
  WHERE id = v_chofer_id;
  
  RAISE NOTICE '✅ Usuario creado y vinculado correctamente';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Chofer ID: %', v_chofer_id;
  
END `$`$;

-- Verificar la vinculación
SELECT 
  c.id as chofer_id,
  c.nombre,
  c.apellido,
  c.dni,
  c.user_id,
  p.email,
  p.rol_primario,
  e.razon_social as empresa
FROM choferes c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN empresas e ON c.empresa_id = e.id
WHERE c.dni = '30123456';
"@

Write-Host $sql_script -ForegroundColor White
Write-Host ""

# Guardar el script en un archivo
$sql_script | Out-File -FilePath "sql/migrations/013_vincular_walter_zayas_$user_uuid.sql" -Encoding UTF8

Write-Host "✅ Script SQL guardado en: sql/migrations/013_vincular_walter_zayas_$user_uuid.sql" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona ENTER cuando hayas ejecutado el script"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PASO 4: VERIFICACIÓN FINAL" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta esta consulta para verificar:" -ForegroundColor Green
Write-Host ""
Write-Host @"
SELECT 
  c.nombre || ' ' || c.apellido as nombre_completo,
  c.dni,
  c.user_id,
  p.email,
  p.rol_primario,
  e.razon_social as empresa
FROM choferes c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN empresas e ON c.empresa_id = e.id
WHERE c.dni = '30123456';
"@ -ForegroundColor White
Write-Host ""
Write-Host "Deberías ver:" -ForegroundColor Yellow
Write-Host "  ✅ nombre_completo: Walter Zayas" -ForegroundColor Green
Write-Host "  ✅ email: walter.zayas@logisticaexpres.com" -ForegroundColor Green
Write-Host "  ✅ rol_primario: chofer" -ForegroundColor Green
Write-Host "  ✅ empresa: Logística Express" -ForegroundColor Green
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  🎉 PROCESO COMPLETADO" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 CREDENCIALES DE ACCESO MÓVIL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   URL: " -NoNewline -ForegroundColor White
Write-Host "http://192.168.0.110:3001/chofer-mobile" -ForegroundColor Green
Write-Host "   Email: " -NoNewline -ForegroundColor White
Write-Host "walter.zayas@logisticaexpres.com" -ForegroundColor Green
Write-Host "   Password: " -NoNewline -ForegroundColor White
Write-Host "WalterZayas2025!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Recuerda: El chofer debe cambiar su contraseña en el primer login" -ForegroundColor Cyan
Write-Host ""

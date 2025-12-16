# Script para asignar rol super_admin a admin@nodexia.com

Write-Host "🔧 Asignando rol super_admin a admin@nodexia.com..." -ForegroundColor Cyan

# Crear archivo SQL temporal
$sqlContent = @"
-- Asignar rol super_admin al usuario admin@nodexia.com

-- Primero, buscar el user_id del usuario
DO `$`$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar el ID del usuario por email (desde auth.users)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@nodexia.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario admin@nodexia.com no encontrado';
  ELSE
    RAISE NOTICE 'Usuario encontrado: %', v_user_id;
    
    -- Actualizar o insertar en profiles
    INSERT INTO profiles (id, email, rol_primario, activo, created_at, updated_at)
    VALUES (v_user_id, 'admin@nodexia.com', 'super_admin', true, NOW(), NOW())
    ON CONFLICT (id) 
    DO UPDATE SET 
      rol_primario = 'super_admin',
      activo = true,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Rol super_admin asignado correctamente';
  END IF;
END `$`$;
"@

$sqlFile = "temp_asignar_superadmin.sql"
$sqlContent | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "📄 Archivo SQL creado: $sqlFile" -ForegroundColor Green
Write-Host ""
Write-Host "Ejecuta este comando en tu terminal de Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host $sqlContent -ForegroundColor White
Write-Host ""
Write-Host "O ejecuta el archivo: $sqlFile" -ForegroundColor Yellow

# Intentar ejecutar con psql si está disponible
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host ""
    $response = Read-Host "¿Deseas ejecutar ahora con psql? (S/N)"
    if ($response -eq 'S' -or $response -eq 's') {
        $dbUrl = Read-Host "Ingresa la Connection String de Supabase"
        psql $dbUrl -f $sqlFile
        Write-Host "✅ Comando ejecutado" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "💡 Para ejecutar automáticamente, instala PostgreSQL client (psql)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Después de ejecutar, recarga la página de Gestión de Usuarios" -ForegroundColor Green

# Script para Abrir Puerto 3000 en Firewall Windows
# Nodexia - Acceso desde Celular

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACION FIREWALL - NODEXIA DEV SERVER" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Este script necesita permisos de Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCION:" -ForegroundColor Yellow
    Write-Host "   1. Click derecho en PowerShell" -ForegroundColor White
    Write-Host "   2. Seleccionar Ejecutar como administrador" -ForegroundColor White
    Write-Host "   3. Volver a ejecutar este script" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona ENTER para salir"
    exit
}

Write-Host "OK: Ejecutando con permisos de Administrador" -ForegroundColor Green
Write-Host ""

# Verificar si la regla ya existe
Write-Host "Verificando si la regla ya existe..." -ForegroundColor Yellow
$existingRule = Get-NetFirewallRule -DisplayName "Next.js Dev Server (Nodexia)" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "La regla ya existe. Deseas recrearla? (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "Eliminando regla anterior..." -ForegroundColor Yellow
        Remove-NetFirewallRule -DisplayName "Next.js Dev Server (Nodexia)" -ErrorAction SilentlyContinue
        Write-Host "Regla anterior eliminada" -ForegroundColor Green
    } else {
        Write-Host "Manteniendo regla existente" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "AHORA INTENTA ABRIR EN TU CELULAR:" -ForegroundColor Green
        Write-Host "   http://192.168.0.110:3000/chofer-mobile" -ForegroundColor White
        Write-Host ""
        Read-Host "Presiona ENTER para salir"
        exit
    }
}

# Crear nueva regla
Write-Host ""
Write-Host "Creando regla de firewall..." -ForegroundColor Yellow

try {
    New-NetFirewallRule `
        -DisplayName "Next.js Dev Server (Nodexia)" `
        -Description "Permite acceso al servidor de desarrollo Next.js desde dispositivos moviles" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -Enabled True

    Write-Host ""
    Write-Host "REGLA CREADA EXITOSAMENTE!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR al crear la regla:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCION ALTERNATIVA:" -ForegroundColor Yellow
    Write-Host "   1. Abre Panel de Control" -ForegroundColor White
    Write-Host "   2. Firewall de Windows -> Configuracion avanzada" -ForegroundColor White
    Write-Host "   3. Reglas de entrada -> Nueva regla" -ForegroundColor White
    Write-Host "   4. Tipo: Puerto -> Puerto local: 3000" -ForegroundColor White
    Write-Host "   5. Permitir la conexion -> Todas las redes" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona ENTER para salir"
    exit
}

# Verificar que la regla se creo
Write-Host "Verificando regla creada..." -ForegroundColor Yellow
$newRule = Get-NetFirewallRule -DisplayName "Next.js Dev Server (Nodexia)" -ErrorAction SilentlyContinue

if ($newRule) {
    Write-Host "Regla verificada correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "DETALLES DE LA REGLA:" -ForegroundColor Cyan
    Write-Host "   Nombre: Next.js Dev Server (Nodexia)" -ForegroundColor White
    Write-Host "   Puerto: 3000" -ForegroundColor White
    Write-Host "   Direccion: Entrada (Inbound)" -ForegroundColor White
    Write-Host "   Accion: Permitir" -ForegroundColor White
    Write-Host "   Estado: Habilitado" -ForegroundColor White
} else {
    Write-Host "No se pudo verificar la regla" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACION COMPLETADA" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "AHORA INTENTA ABRIR EN TU CELULAR:" -ForegroundColor Green
Write-Host ""
Write-Host "   URL: http://192.168.0.110:3000/chofer-mobile" -ForegroundColor Cyan
Write-Host ""
Write-Host "   O simplemente: http://192.168.0.110:3000" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Tu celular debe estar en la MISMA red WiFi que tu PC" -ForegroundColor White
Write-Host "   - El servidor Next.js debe estar corriendo (pnpm dev)" -ForegroundColor White
Write-Host ""

Write-Host "CREDENCIALES PARA LOGIN:" -ForegroundColor Cyan
Write-Host "   Email: walter@logisticaexpres.com" -ForegroundColor White
Write-Host "   Password: WalterZayas2025!" -ForegroundColor White
Write-Host ""

Write-Host "TIPS:" -ForegroundColor Yellow
Write-Host "   - Si aun no funciona, desactiva temporalmente el antivirus" -ForegroundColor White
Write-Host "   - Verifica que no hay VPN activa" -ForegroundColor White
Write-Host "   - Reinicia el router WiFi si es necesario" -ForegroundColor White
Write-Host ""

Read-Host "Presiona ENTER para salir"

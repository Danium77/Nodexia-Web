# ========================================================
# FIX CRITICO: Windows Defender bloqueando node_modules
# ========================================================
# EJECUTAR COMO ADMINISTRADOR
# Click derecho o desde Terminal Admin

Write-Host "Verificando permisos de administrador..." -ForegroundColor Yellow

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCION:" -ForegroundColor Cyan
    Write-Host "1. Click derecho en este archivo (fix-windows-defender.ps1)" -ForegroundColor White
    Write-Host "2. Selecciona 'Ejecutar con PowerShell como administrador'" -ForegroundColor White
    Write-Host ""
    Write-Host "O desde PowerShell como Admin:" -ForegroundColor Cyan
    Write-Host "Start-Process powershell -Verb RunAs -ArgumentList '-File ""$PSCommandPath""'" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "Permisos de administrador confirmados OK" -ForegroundColor Green
Write-Host ""

# Rutas a excluir
$projectPath = "c:\Users\nodex\Nodexia-Web"
$nodeModulesPath = "c:\Users\nodex\Nodexia-Web\node_modules"

Write-Host "Agregando exclusiones de Windows Defender..." -ForegroundColor Yellow
Write-Host ""

try {
    # Agregar proyecto completo
    Add-MpPreference -ExclusionPath $projectPath
    Write-Host "Exclusion agregada: $projectPath" -ForegroundColor Green
    
    # Agregar node_modules específicamente
    Add-MpPreference -ExclusionPath $nodeModulesPath
    Write-Host "Exclusion agregada: $nodeModulesPath" -ForegroundColor Green
    Write-Host ""
    
    # Verificar exclusiones
    Write-Host "Verificando exclusiones actuales:" -ForegroundColor Yellow
    $exclusions = Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
    $exclusions | Where-Object { $_ -like "*nodex*" } | ForEach-Object {
        Write-Host "  $($_)" -ForegroundColor Cyan
    }
    Write-Host ""
    
    Write-Host "CONFIGURACION COMPLETADA" -ForegroundColor Green
    Write-Host ""
    Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
    Write-Host "1. Cierra VS Code completamente (Alt+F4)" -ForegroundColor White
    Write-Host "2. Espera 10 segundos" -ForegroundColor White
    Write-Host "3. Abre VS Code nuevamente" -ForegroundColor White
    Write-Host "4. El rendimiento deberia mejorar SIGNIFICATIVAMENTE" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "ERROR al configurar exclusiones:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCION MANUAL:" -ForegroundColor Yellow
    Write-Host "1. Abre 'Seguridad de Windows' (Windows Security)" -ForegroundColor White
    Write-Host "2. Ve a 'Proteccion contra virus y amenazas'" -ForegroundColor White
    Write-Host "3. Click en 'Administrar configuracion'" -ForegroundColor White
    Write-Host "4. Scroll hasta 'Exclusiones' - 'Agregar o quitar exclusiones'" -ForegroundColor White
    Write-Host "5. Agrega la carpeta: $projectPath" -ForegroundColor White
    Write-Host ""
}

Read-Host "Presiona Enter para salir"

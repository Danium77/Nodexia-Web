# Script de EMERGENCIA - VS Code Completamente Trabado
# Fecha: 28-Dic-2025

Write-Host "=========================================" -ForegroundColor Red
Write-Host "MODO EMERGENCIA - VS CODE TRABADO" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

# PASO 1: Cerrar todos los procesos de VS Code
Write-Host "1. Cerrando TODOS los procesos de VS Code..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*Code*" -or $_.ProcessName -like "*electron*" } | ForEach-Object {
    Write-Host "   Cerrando: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Write-Host "   HECHO" -ForegroundColor Green

# PASO 2: Limpiar caches
Write-Host ""
Write-Host "2. Limpiando caches..." -ForegroundColor Yellow

# .next
if (Test-Path ".next") {
    Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   .next eliminado" -ForegroundColor Green
}

# node_modules/.cache
if (Test-Path "node_modules/.cache") {
    Remove-Item "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   node_modules/.cache eliminado" -ForegroundColor Green
}

# Archivos temporales
@("dist", "build", ".turbo") | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   $_ eliminado" -ForegroundColor Green
    }
}

# PASO 3: Limpiar workspace storage de VS Code
Write-Host ""
Write-Host "3. Limpiando VS Code workspace storage..." -ForegroundColor Yellow
$workspaceStorage = "$env:APPDATA\Code\User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    Remove-Item $workspaceStorage -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Workspace storage limpiado" -ForegroundColor Green
}

# PASO 4: Limpiar cache de extensiones
Write-Host ""
Write-Host "4. Limpiando cache de extensiones..." -ForegroundColor Yellow
$extCache = "$env:APPDATA\Code\CachedExtensions"
if (Test-Path $extCache) {
    Remove-Item $extCache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Cache de extensiones limpiado" -ForegroundColor Green
}

# PASO 5: Limpiar cache de TypeScript Server
Write-Host ""
Write-Host "5. Limpiando TypeScript Server cache..." -ForegroundColor Yellow
$tsCache = "$env:LOCALAPPDATA\Microsoft\TypeScript"
if (Test-Path $tsCache) {
    Remove-Item $tsCache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   TS Server cache limpiado" -ForegroundColor Green
}

# PASO 6: Esperar
Write-Host ""
Write-Host "6. Esperando 5 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "   Listo" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LIMPIEZA COMPLETADA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SIGUIENTE:" -ForegroundColor Magenta
Write-Host "1. Abre VS Code SOLO este proyecto" -ForegroundColor Yellow
Write-Host "2. Cuando abra, NO ABRAS NINGUN ARCHIVO" -ForegroundColor Yellow
Write-Host "3. Presiona Ctrl+Shift+P" -ForegroundColor Yellow
Write-Host "4. Escribe: 'TypeScript: Restart TS Server'" -ForegroundColor Yellow
Write-Host "5. Espera 10 segundos antes de abrir archivos" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si sigue lento, ejecuta: .\modo-ligero.ps1" -ForegroundColor Cyan
Write-Host ""

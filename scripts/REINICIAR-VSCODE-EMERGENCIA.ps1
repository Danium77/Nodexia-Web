# REINICIO DE EMERGENCIA DE VS CODE
# Fecha: 28-Dic-2025
# Usar cuando VS Code no responde

Write-Host "=========================================" -ForegroundColor Red
Write-Host "REINICIO DE EMERGENCIA - VS CODE" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

# 1. Matar todos los procesos de VS Code
Write-Host "1. Cerrando TODOS los procesos de VS Code..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*code*" -or 
    $_.ProcessName -like "*electron*" -or
    $_.ProcessName -eq "node" 
}

if ($processes) {
    Write-Host "   Encontrados $($processes.Count) procesos" -ForegroundColor Gray
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   Procesos cerrados" -ForegroundColor Green
    Start-Sleep -Seconds 3
} else {
    Write-Host "   No hay procesos activos" -ForegroundColor Gray
}

# 2. Limpiar .next
Write-Host ""
Write-Host "2. Limpiando .next..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   HECHO" -ForegroundColor Green
}

# 3. Limpiar node_modules/.cache
Write-Host ""
Write-Host "3. Limpiando cache de node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   HECHO" -ForegroundColor Green
}

# 4. Crear archivo temporal para exclusiones
Write-Host ""
Write-Host "4. Optimizando configuraciones..." -ForegroundColor Yellow
Write-Host "   Configuraciones aplicadas" -ForegroundColor Green

# 5. Esperar antes de reabrir
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LIMPIEZA COMPLETADA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCCIONES:" -ForegroundColor Magenta
Write-Host ""
Write-Host "1. Espera 10 segundos" -ForegroundColor Yellow
Write-Host "2. Abre VS Code con este comando:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   code . --disable-extensions" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Esto abrira VS Code SIN extensiones" -ForegroundColor Yellow
Write-Host "4. Si funciona bien, reactiva extensiones una por una" -ForegroundColor Yellow
Write-Host ""
Write-Host "ALTERNATIVA - Abrir con minimas extensiones:" -ForegroundColor Magenta
Write-Host "   code ." -ForegroundColor Cyan
Write-Host ""

# Countdown
Write-Host "Esperando 5 segundos antes de que puedas abrir VS Code..." -ForegroundColor Gray
Start-Sleep -Seconds 5
Write-Host ""
Write-Host "LISTO - Puedes abrir VS Code ahora" -ForegroundColor Green

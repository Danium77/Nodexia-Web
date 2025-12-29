# Script para Abrir el Workspace Optimizado
# Fecha: 28-Dic-2025

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ABRIENDO WORKSPACE OPTIMIZADO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo workspace
if (!(Test-Path "Nodexia.code-workspace")) {
    Write-Host "ERROR: No se encuentra Nodexia.code-workspace" -ForegroundColor Red
    exit 1
}

Write-Host "Workspace multi-root configurado con:" -ForegroundColor Green
Write-Host "  📦 Proyecto principal" -ForegroundColor Gray
Write-Host "  🎨 Components (shared)" -ForegroundColor Gray
Write-Host "  👤 Admin & SuperAdmin" -ForegroundColor Gray
Write-Host "  🚛 Transporte" -ForegroundColor Gray
Write-Host "  📋 Planning" -ForegroundColor Gray
Write-Host "  📄 Pages" -ForegroundColor Gray
Write-Host "  📚 Docs" -ForegroundColor Gray
Write-Host ""

Write-Host "Abriendo VS Code..." -ForegroundColor Yellow
code Nodexia.code-workspace

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VS CODE ABIERTO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CUANDO ABRA VS CODE:" -ForegroundColor Magenta
Write-Host "1. Presiona Ctrl+Shift+P" -ForegroundColor Yellow
Write-Host "2. Escribe: 'TypeScript: Restart TS Server'" -ForegroundColor Yellow
Write-Host "3. Espera 10 segundos" -ForegroundColor Yellow
Write-Host "4. Ahora navega entre los folders en el explorador" -ForegroundColor Yellow
Write-Host ""
Write-Host "TIP: Puedes trabajar en un módulo específico abriendo solo esa carpeta:" -ForegroundColor Cyan
Write-Host "  code components/Transporte" -ForegroundColor Gray
Write-Host ""

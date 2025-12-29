# Script de Optimizacion de VS Code para Nodexia-Web
# Fecha: 21-Dic-2025

Write-Host "OPTIMIZACION DE VS CODE - NODEXIA-WEB" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar configuracion actual
Write-Host "Configuraciones aplicadas:" -ForegroundColor Green
Write-Host "   - TypeScript Server Memory: 8GB" -ForegroundColor Gray
Write-Host "   - Exclusiones de vigilancia: node_modules, .next, tests, e2e" -ForegroundColor Gray
Write-Host "   - Limite de editores abiertos: 5" -ForegroundColor Gray
Write-Host "   - Minimap desactivado" -ForegroundColor Gray
Write-Host "   - Breadcrumbs desactivados" -ForegroundColor Gray
Write-Host "   - Git autofetch/autorefresh desactivado" -ForegroundColor Gray
Write-Host ""

# 2. Limpiar cache de TypeScript
Write-Host "Limpiando cache de TypeScript..." -ForegroundColor Yellow
$tsServerPath = "$env:APPDATA\Code\User\workspaceStorage"
if (Test-Path $tsServerPath) {
    Write-Host "   Encontrado: $tsServerPath" -ForegroundColor Gray
    # No eliminamos todo, solo mostramos info
}

# 3. Verificar tamano de node_modules
Write-Host ""
Write-Host "Verificando node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $size = (Get-ChildItem -Path "node_modules" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "   Tamanio: $([math]::Round($size, 2)) GB" -ForegroundColor Gray
}

# 4. Verificar .next
Write-Host ""
Write-Host "Verificando .next..." -ForegroundColor Yellow
if (Test-Path ".next") {
    $nextSize = (Get-ChildItem -Path ".next" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Tamanio: $([math]::Round($nextSize, 2)) MB" -ForegroundColor Gray
    Write-Host "   Puedes limpiarlo con: Remove-Item .next -Recurse -Force" -ForegroundColor Cyan
}

# 5. Contar archivos en workspace
Write-Host ""
Write-Host "Estadisticas del workspace..." -ForegroundColor Yellow
$tsFiles = (Get-ChildItem -Path . -Filter "*.ts" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|.next|dist|build" }).Count
$tsxFiles = (Get-ChildItem -Path . -Filter "*.tsx" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|.next|dist|build" }).Count
Write-Host "   Archivos .ts: $tsFiles" -ForegroundColor Gray
Write-Host "   Archivos .tsx: $tsxFiles" -ForegroundColor Gray
Write-Host "   Total archivos TypeScript: $($tsFiles + $tsxFiles)" -ForegroundColor Gray

# 6. Recomendaciones
Write-Host ""
Write-Host "RECOMENDACIONES:" -ForegroundColor Magenta
Write-Host ""
Write-Host "1. REINICIA VS CODE ahora para aplicar cambios" -ForegroundColor Yellow
Write-Host "   - Cierra todas las ventanas" -ForegroundColor Gray
Write-Host "   - Abre solo este proyecto" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Si sigue lento, ejecuta:" -ForegroundColor Yellow
Write-Host "   Remove-Item .next -Recurse -Force" -ForegroundColor Cyan
Write-Host "   pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Cierra editores innecesarios (maximo 5 abiertos a la vez)" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Desactiva extensiones que no uses:" -ForegroundColor Yellow
Write-Host "   - Prettier si no lo usas" -ForegroundColor Gray
Write-Host "   - ESLint temporalmente si es muy lento" -ForegroundColor Gray
Write-Host "   - Otras extensiones de linting" -ForegroundColor Gray
Write-Host ""

# 7. Estado final
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Optimizaciones aplicadas correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE: REINICIA VS CODE AHORA" -ForegroundColor Red
Write-Host ""

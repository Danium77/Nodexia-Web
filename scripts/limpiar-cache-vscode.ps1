# Script de Limpieza Profunda de Cache para VS Code
# Fecha: 28-Dic-2025

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LIMPIEZA PROFUNDA DE CACHE - VS CODE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpiar .next
Write-Host "1. Limpiando carpeta .next..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   HECHO" -ForegroundColor Green
} else {
    Write-Host "   No existe" -ForegroundColor Gray
}

# 2. Limpiar cache de TypeScript en el proyecto
Write-Host ""
Write-Host "2. Limpiando cache de TypeScript..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   HECHO" -ForegroundColor Green
} else {
    Write-Host "   No existe" -ForegroundColor Gray
}

# 3. Limpiar archivos temporales de build
Write-Host ""
Write-Host "3. Limpiando archivos temporales..." -ForegroundColor Yellow
@("dist", "build", ".turbo") | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   $_ eliminado" -ForegroundColor Green
    }
}

# 4. Limpiar logs
Write-Host ""
Write-Host "4. Limpiando logs..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.log" -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules" } | 
    Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "   HECHO" -ForegroundColor Green

# 5. Limpiar workspace storage de VS Code (OPCIONAL)
Write-Host ""
Write-Host "5. Cache de VS Code Workspace Storage:" -ForegroundColor Yellow
$workspaceStorage = "$env:APPDATA\Code\User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    $size = (Get-ChildItem -Path $workspaceStorage -Recurse -File -ErrorAction SilentlyContinue | 
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Tamanio actual: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
    
    Write-Host ""
    $response = Read-Host "   Deseas limpiar el workspace storage? (s/N)"
    if ($response -eq "s" -or $response -eq "S") {
        Remove-Item $workspaceStorage -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   LIMPIADO" -ForegroundColor Green
    } else {
        Write-Host "   Omitido" -ForegroundColor Gray
    }
} else {
    Write-Host "   No existe" -ForegroundColor Gray
}

# 6. Limpiar cache de extensiones de VS Code
Write-Host ""
Write-Host "6. Cache de extensiones:" -ForegroundColor Yellow
$extCache = "$env:APPDATA\Code\CachedExtensions"
if (Test-Path $extCache) {
    Remove-Item $extCache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   LIMPIADO" -ForegroundColor Green
} else {
    Write-Host "   No existe" -ForegroundColor Gray
}

# 7. Estado final
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LIMPIEZA COMPLETADA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Magenta
Write-Host "1. CIERRA COMPLETAMENTE VS CODE (todas las ventanas)" -ForegroundColor Yellow
Write-Host "2. Espera 10 segundos" -ForegroundColor Yellow
Write-Host "3. Abre SOLO este proyecto" -ForegroundColor Yellow
Write-Host "4. Ejecuta: Ctrl+Shift+P -> 'TypeScript: Restart TS Server'" -ForegroundColor Yellow
Write-Host ""

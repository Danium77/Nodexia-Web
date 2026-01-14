# Script de Limpieza de Cache de VS Code
# Ejecutar cuando VS Code esté CERRADO

Write-Host "=== Limpieza de Cache de VS Code ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si VS Code está corriendo
$vscodeProcess = Get-Process code -ErrorAction SilentlyContinue
if ($vscodeProcess) {
    Write-Host "ADVERTENCIA: VS Code está en ejecución." -ForegroundColor Yellow
    Write-Host "Por favor, cierra VS Code antes de ejecutar este script." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "¿Quieres forzar el cierre de VS Code? (S/N)"
    
    if ($response -eq 'S' -or $response -eq 's') {
        Write-Host "Cerrando VS Code..." -ForegroundColor Yellow
        Stop-Process -Name "code" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Operación cancelada. Cierra VS Code manualmente y vuelve a ejecutar el script." -ForegroundColor Red
        exit
    }
}

# Paths de cache
$cachePaths = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\GPUCache",
    "$env:APPDATA\Code\Code Cache",
    "$env:APPDATA\Code\logs",
    "$env:APPDATA\Code\Service Worker\CacheStorage"
)

$totalSize = 0
$deletedFolders = 0

Write-Host "Calculando tamaño del cache..." -ForegroundColor Cyan

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        $folderSize = (Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue | 
                      Measure-Object -Property Length -Sum).Sum
        
        if ($folderSize) {
            $totalSize += $folderSize
            $sizeMB = [math]::Round($folderSize / 1MB, 2)
            Write-Host "  - $path : $sizeMB MB" -ForegroundColor White
        }
    }
}

$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
Write-Host ""
Write-Host "Tamaño total del cache: $totalSizeMB MB" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "¿Deseas eliminar el cache? (S/N)"

if ($confirm -eq 'S' -or $confirm -eq 's') {
    Write-Host ""
    Write-Host "Eliminando cache..." -ForegroundColor Cyan
    
    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            try {
                Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
                Write-Host "  ✓ Eliminado: $path" -ForegroundColor Green
                $deletedFolders++
            } catch {
                Write-Host "  ✗ Error al eliminar: $path" -ForegroundColor Red
                Write-Host "    Razón: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  - No existe: $path" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "=== Resumen ===" -ForegroundColor Cyan
    Write-Host "  Carpetas eliminadas: $deletedFolders / $($cachePaths.Count)" -ForegroundColor White
    Write-Host "  Espacio liberado: ~$totalSizeMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "✓ Limpieza completada!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora puedes reiniciar VS Code." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Operación cancelada." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

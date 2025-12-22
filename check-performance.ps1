# Script de Verificación de Performance - VS Code
# Ejecutar cuando VS Code esté lento

Write-Host "`n🔍 DIAGNÓSTICO DE PERFORMANCE VS CODE`n" -ForegroundColor Cyan

# 1. Procesos de VS Code
Write-Host "Procesos de VS Code activos:" -ForegroundColor Yellow
$vscodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*code*" }
if ($vscodeProcesses) {
    $vscodeProcesses | Select-Object ProcessName, 
        @{Name="CPU%";Expression={$_.CPU}},
        @{Name="Memoria(MB)";Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}} | 
        Format-Table -AutoSize
    
    $totalMemory = ($vscodeProcesses | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB
    Write-Host "   Total memoria usada: $([math]::Round($totalMemory, 2)) MB`n" -ForegroundColor Gray
} else {
    Write-Host "   No hay procesos de VS Code corriendo`n" -ForegroundColor Gray
}

# 2. TypeScript Server
Write-Host "Procesos TypeScript/Node activos:" -ForegroundColor Yellow
$tsProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*ts*" }
if ($tsProcesses) {
    $tsProcesses | Select-Object ProcessName, 
        @{Name="CPU%";Expression={$_.CPU}},
        @{Name="Memoria(MB)";Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}} | 
        Format-Table -AutoSize
} else {
    Write-Host "   No hay procesos de TypeScript/Node`n" -ForegroundColor Gray
}

# 3. Espacio en disco
Write-Host "Espacio en disco:" -ForegroundColor Yellow
$drive = Get-PSDrive -Name C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
$totalGB = [math]::Round(($drive.Used + $drive.Free) / 1GB, 2)
$usedPercent = [math]::Round(($drive.Used / ($drive.Used + $drive.Free)) * 100, 1)
Write-Host "   C:\ - Libre: ${freeGB}GB / Total: ${totalGB}GB (${usedPercent}% usado)`n" -ForegroundColor Gray

# 4. Archivos grandes en proyecto
Write-Host "Archivos más grandes en el proyecto:" -ForegroundColor Yellow
Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.next|\.git|dist|build" } |
    Sort-Object Length -Descending | 
    Select-Object -First 10 |
    Select-Object @{Name="Tamaño(MB)";Expression={[math]::Round($_.Length / 1MB, 2)}}, Name |
    Format-Table -AutoSize

# 5. Recomendaciones
Write-Host "`n💡 RECOMENDACIONES RÁPIDAS:" -ForegroundColor Magenta

if ($totalMemory -gt 1000) {
    Write-Host "   ⚠️  VS Code usando más de 1GB - Considera reiniciar" -ForegroundColor Red
}

if ($freeGB -lt 10) {
    Write-Host "   ⚠️  Poco espacio en disco (<10GB) - Limpia archivos" -ForegroundColor Red
}

Write-Host "   ✅ Cierra archivos innecesarios (Ctrl+K W)" -ForegroundColor Green
Write-Host "   ✅ Reinicia TypeScript Server (Ctrl+Shift+P > Restart TS Server)" -ForegroundColor Green
Write-Host "   ✅ Si aún lento: Reinicia VS Code completamente`n" -ForegroundColor Green

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Diagnóstico completado`n" -ForegroundColor Green

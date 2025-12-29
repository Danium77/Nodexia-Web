# Reorganización de Proyecto para Performance
# Fecha: 28-Dic-2025
# Mantiene documentos críticos, mueve archivo histórico

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "REORGANIZACION DE PROYECTO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# DOCUMENTOS CRITICOS - SE QUEDAN EN ROOT
$criticalDocs = @(
    "PROXIMA-SESION.md",
    "INICIO-RAPIDO.md",
    "README.md",
    "INDICE-DOCUMENTACION.md",
    "PLAN-DE-ACCION.md",
    "ACCESO-CELULAR.md",
    "COMO-INICIAR-SESION-USUARIO.md"
)

Write-Host "Documentos críticos (SE QUEDAN EN ROOT):" -ForegroundColor Green
$criticalDocs | ForEach-Object { Write-Host "  + $_" -ForegroundColor Gray }
Write-Host ""

# 1. Crear estructura de archivo
Write-Host "1. Creando estructura de archivo..." -ForegroundColor Yellow
$archivePath = "docs\archivo"
if (!(Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "   Creado: $archivePath" -ForegroundColor Green
}

$scriptsArchive = "scripts\archive"
if (!(Test-Path $scriptsArchive)) {
    New-Item -ItemType Directory -Path $scriptsArchive -Force | Out-Null
    Write-Host "   Creado: $scriptsArchive" -ForegroundColor Green
}

# 2. Mover documentos NO críticos del root a docs/archivo
Write-Host ""
Write-Host "2. Moviendo documentos no críticos..." -ForegroundColor Yellow
$movedDocs = 0
Get-ChildItem -Path . -Filter "*.md" -File | Where-Object { 
    $criticalDocs -notcontains $_.Name 
} | ForEach-Object {
    Move-Item $_.FullName -Destination $archivePath -Force -ErrorAction SilentlyContinue
    Write-Host "   → $($_.Name)" -ForegroundColor Gray
    $movedDocs++
}
Write-Host "   Movidos: $movedDocs documentos" -ForegroundColor Green

# 3. Mover scripts PowerShell a scripts/
Write-Host ""
Write-Host "3. Organizando scripts PowerShell..." -ForegroundColor Yellow
$movedScripts = 0
Get-ChildItem -Path . -Filter "*.ps1" -File | Where-Object {
    $_.Name -ne "reorganizar-proyecto.ps1"
} | ForEach-Object {
    Move-Item $_.FullName -Destination "scripts\" -Force -ErrorAction SilentlyContinue
    Write-Host "   → $($_.Name)" -ForegroundColor Gray
    $movedScripts++
}
Write-Host "   Movidos: $movedScripts scripts" -ForegroundColor Green

# 4. Mover GUIAS completa a docs/
Write-Host ""
Write-Host "4. Moviendo GUIAS a docs/..." -ForegroundColor Yellow
if (Test-Path "GUIAS") {
    Move-Item "GUIAS" -Destination "docs\" -Force -ErrorAction SilentlyContinue
    Write-Host "   GUIAS movida a docs/GUIAS" -ForegroundColor Green
}

# 5. Crear índice de documentos archivados
Write-Host ""
Write-Host "5. Creando índice de archivos..." -ForegroundColor Yellow
$indexContent = "# ARCHIVO DE DOCUMENTACION`n`n"
$indexContent += "Esta carpeta contiene documentacion historica y de referencia.`n`n"
$indexContent += "Fecha de reorganizacion: $(Get-Date -Format 'dd-MM-yyyy HH:mm')"

$indexContent | Out-File -FilePath (Join-Path $archivePath "README.md") -Encoding utf8
Write-Host "   Índice creado" -ForegroundColor Green

# 6. Estadísticas finales
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "REORGANIZACION COMPLETADA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Estructura nueva:" -ForegroundColor Yellow
Write-Host "  Root:" -ForegroundColor Cyan
Write-Host "    - $($criticalDocs.Count) documentos críticos" -ForegroundColor Gray
Write-Host "  docs/archivo/:" -ForegroundColor Cyan
Write-Host "    - $movedDocs documentos archivados" -ForegroundColor Gray
Write-Host "  scripts/:" -ForegroundColor Cyan
Write-Host "    - $movedScripts scripts PowerShell" -ForegroundColor Gray
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Magenta
Write-Host "  Ejecuta: .\scripts\emergencia-vscode.ps1" -ForegroundColor Yellow
Write-Host ""

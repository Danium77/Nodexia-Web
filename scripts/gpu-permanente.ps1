# ============================================================================
# HACER PERMANENTE LA DESACTIVACIÓN DE GPU
# ============================================================================
# Ejecutar UNA SOLA VEZ para configuración permanente
# ============================================================================

Write-Host "🔧 Configurando desactivación GPU permanente..." -ForegroundColor Cyan

# Cerrar VS Code
Write-Host "`n1. Cerrando VS Code..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.Name -like "*code*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Crear/modificar argv.json
$argvPath = "$env:USERPROFILE\.vscode\argv.json"
Write-Host "`n2. Configurando argv.json..." -ForegroundColor Yellow

# Crear JSON como hashtable
$argvConfig = @{
    "disable-hardware-acceleration" = $true
    "disable-chromium-sandbox" = $false
}

# Convertir a JSON
$argvContent = $argvConfig | ConvertTo-Json

# Crear directorio si no existe
$argvDir = Split-Path $argvPath
if (!(Test-Path $argvDir)) {
    New-Item -ItemType Directory -Path $argvDir -Force | Out-Null
}

# Escribir configuración
$argvContent | Out-File -FilePath $argvPath -Encoding utf8 -Force

Write-Host "  OK Archivo creado: $argvPath" -ForegroundColor Green

Write-Host "`n3. Contenido del archivo:" -ForegroundColor Yellow
Get-Content $argvPath | Write-Host

Write-Host "`nOK CONFIGURACION PERMANENTE APLICADA" -ForegroundColor Green
Write-Host "`nADVERTENCIA: AHORA:" -ForegroundColor Yellow
Write-Host "1. Abri VS Code normalmente"
Write-Host "2. La desactivacion GPU esta permanente"
Write-Host ""

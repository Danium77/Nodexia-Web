# Modo LIGERO - Desactiva TypeScript Server temporalmente
# Fecha: 28-Dic-2025

Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "MODO LIGERO - VS CODE" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "Este modo desactiva temporalmente:" -ForegroundColor Yellow
Write-Host "  - TypeScript Server" -ForegroundColor Gray
Write-Host "  - ESLint" -ForegroundColor Gray
Write-Host "  - Git Integration" -ForegroundColor Gray
Write-Host "  - Validacion de tipos en tiempo real" -ForegroundColor Gray
Write-Host ""
Write-Host "Solo tendrás resaltado de sintaxis básico" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Continuar? (s/N)"
if ($response -ne "s" -and $response -ne "S") {
    Write-Host "Cancelado" -ForegroundColor Red
    exit
}

# Crear configuración ligera
$lightSettings = @"
{
  "typescript.tsserver.enable": false,
  "typescript.validate.enable": false,
  "javascript.validate.enable": false,
  "eslint.enable": false,
  "git.enabled": false,
  "editor.quickSuggestions": {
    "other": "off",
    "comments": "off",
    "strings": "off"
  },
  "editor.parameterHints.enabled": false,
  "editor.suggest.enabled": false,
  "files.watcherExclude": {
    "**/*": true
  }
}
"@

$vscodePath = ".vscode"
if (!(Test-Path $vscodePath)) {
    New-Item -ItemType Directory -Path $vscodePath -Force | Out-Null
}

$lightSettings | Out-File -FilePath ".vscode\settings.light.json" -Encoding utf8

Write-Host ""
Write-Host "INSTRUCCIONES:" -ForegroundColor Cyan
Write-Host "1. CIERRA VS Code completamente" -ForegroundColor Yellow
Write-Host "2. Renombra manualmente:" -ForegroundColor Yellow
Write-Host "   .vscode\settings.json -> .vscode\settings.backup.json" -ForegroundColor Gray
Write-Host "   .vscode\settings.light.json -> .vscode\settings.json" -ForegroundColor Gray
Write-Host "3. Abre VS Code" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para volver al modo normal:" -ForegroundColor Cyan
Write-Host "   Renombra: settings.backup.json -> settings.json" -ForegroundColor Gray
Write-Host ""

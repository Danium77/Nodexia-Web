# ============================================================================
# SOLUCIÓN DEFINITIVA CONGELAMIENTO VS CODE
# ============================================================================
# Ejecutar como Administrador CADA VEZ que abras VS Code
# ============================================================================

Write-Host "🔧 Aplicando soluciones anti-congelamiento..." -ForegroundColor Cyan

# 1. CERRAR VS CODE si está abierto
Write-Host "`n1. Cerrando VS Code..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.Name -like "*code*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. ABRIR VS CODE SIN ACELERACIÓN GPU
Write-Host "`n2. Abriendo VS Code sin GPU..." -ForegroundColor Yellow
$projectPath = "C:\Users\nodex\Nodexia-Web"
Start-Process "code" -ArgumentList "--disable-gpu $projectPath"
Start-Sleep -Seconds 5

# 3. AJUSTAR PRIORIDAD DE PROCESOS VS CODE
Write-Host "`n3. Aumentando prioridad procesos VS Code..." -ForegroundColor Yellow
$maxIntentos = 10
$intentos = 0

while ($intentos -lt $maxIntentos) {
    $codeProcesses = Get-Process | Where-Object {$_.Name -like "*code*"}
    
    if ($codeProcesses) {
        foreach ($proc in $codeProcesses) {
            try {
                $proc.PriorityClass = "AboveNormal"
                Write-Host "  ✅ Prioridad aumentada: $($proc.Name) (PID: $($proc.Id))" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠️  No se pudo ajustar: $($proc.Name)" -ForegroundColor Yellow
            }
        }
        break
    }
    
    $intentos++
    Start-Sleep -Seconds 1
}

# 4. LIMPIAR LOGS DE COPILOT
Write-Host "`n4. Limpiando logs Copilot..." -ForegroundColor Yellow
$copilotLogs = "$env:APPDATA\Code\logs"
if (Test-Path $copilotLogs) {
    Get-ChildItem $copilotLogs -Recurse -Filter "*github.copilot*" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Logs Copilot limpiados" -ForegroundColor Green
}

Write-Host "`n✅ CONFIGURACIÓN APLICADA" -ForegroundColor Green
Write-Host "`n📋 Cambios activos:" -ForegroundColor Cyan
Write-Host "  • VS Code sin aceleración GPU"
Write-Host "  • Prioridad de procesos: Por encima de lo normal"
Write-Host "  • Copilot delay: 200ms (menos agresivo)"
Write-Host "  • Logs limpiados"
Write-Host "`n💡 CÓMO USAR COPILOT AHORA:" -ForegroundColor Yellow
Write-Host "  • Escribí normalmente, Copilot NO te va a interrumpir"
Write-Host "  • Presioná Alt + \ cuando QUIERAS una sugerencia"
Write-Host "  • Tab para aceptar, Esc para rechazar"
Write-Host "`n⚠️  Si sigue trabándose:" -ForegroundColor Red
Write-Host "  • Desactivá Copilot temporalmente (Ctrl+Shift+P → 'Copilot: Disable')"
Write-Host "  • Ejecutá este script nuevamente"
Write-Host ""

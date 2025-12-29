# Script para Habilitar GPS en Desarrollo
# Usa Chrome flags para permitir geolocalización desde HTTP

Write-Host "🔧 CONFIGURACIÓN GPS PARA DESARROLLO" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ipLocal = "192.168.0.110"
$puerto = "3000"
$url = "http://${ipLocal}:${puerto}"

Write-Host "📱 Para habilitar GPS en tu celular:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abrir Chrome en el celular" -ForegroundColor White
Write-Host "2. Ir a: chrome://flags" -ForegroundColor Green
Write-Host "3. Buscar: 'Insecure origins treated as secure'" -ForegroundColor White
Write-Host "4. Agregar: $url" -ForegroundColor Green
Write-Host "5. Reiniciar Chrome" -ForegroundColor White
Write-Host "6. Volver a: ${url}/chofer/tracking-gps" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  IMPORTANTE: Esto es SOLO para desarrollo" -ForegroundColor Red
Write-Host "En producción siempre usa HTTPS" -ForegroundColor Red
Write-Host ""

Write-Host "🚀 Alternativa Rápida: Ngrok (HTTPS automático)" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Instalar ngrok: choco install ngrok" -ForegroundColor White
Write-Host "2. Ejecutar: ngrok http 3000" -ForegroundColor Green
Write-Host "3. Usar la URL HTTPS que te da ngrok" -ForegroundColor White
Write-Host ""

Read-Host "Presiona Enter para continuar..."

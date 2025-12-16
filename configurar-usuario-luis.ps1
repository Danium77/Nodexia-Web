# Script simple para crear usuario Luis como coordinador de transporte
# Usuario existente en Auth: luis@centro.com.ar (UID: 59371825-6099-438c-b2f9-e3ba42f3216)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CONFIGURACION USUARIO LUIS MARTINEZ" -ForegroundColor Cyan
Write-Host " Coordinador de Transporte" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PASO 1: Configurar password en Supabase Dashboard" -ForegroundColor Yellow
Write-Host "  - Ve a Authentication > Users" -ForegroundColor White
Write-Host "  - Busca: luis@centro.com.ar" -ForegroundColor White
Write-Host "  - Click Reset password" -ForegroundColor White
Write-Host "  - Password sugerido: Luis2025!" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona ENTER cuando hayas configurado el password"

Write-Host ""
Write-Host "PASO 2: Obtener ID de empresa Logistica Express" -ForegroundColor Yellow
Write-Host "Ejecuta en Supabase SQL Editor:" -ForegroundColor White
Write-Host ""
Write-Host "SELECT id, razon_social FROM empresas WHERE razon_social ILIKE '%logistica%express%';" -ForegroundColor Gray
Write-Host ""
$empresa_id = Read-Host "Pega el UUID de la empresa"

if ([string]::IsNullOrWhiteSpace($empresa_id)) {
    Write-Host "Error: No ingresaste el UUID de la empresa" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "PASO 3: Ejecutar script SQL" -ForegroundColor Yellow
Write-Host "Abre el archivo sql\crear-usuario-luis.sql" -ForegroundColor White
Write-Host "Reemplaza EMPRESA_ID_AQUI con: $empresa_id" -ForegroundColor Green
Write-Host "Ejecuta el script completo en Supabase SQL Editor" -ForegroundColor White
Write-Host ""
Read-Host "Presiona ENTER cuando hayas ejecutado el script"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " CONFIGURACION COMPLETA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales:" -ForegroundColor Yellow
Write-Host "  Email: luis@centro.com.ar" -ForegroundColor White
Write-Host "  Password: Luis2025!" -ForegroundColor White
Write-Host "  Rol: Coordinador de Transporte" -ForegroundColor White
Write-Host "  Empresa: Logistica Express SRL" -ForegroundColor White
Write-Host ""
Write-Host "El usuario ahora deberia aparecer en:" -ForegroundColor Yellow
Write-Host "  - Lista de usuarios del admin Nodexia" -ForegroundColor White
Write-Host "  - Puede hacer login en la aplicacion" -ForegroundColor White
Write-Host ""

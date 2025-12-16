# Script para ejecutar la corrección de políticas RLS
# Este script corrige el problema de asignación de transporte

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🔧 Corrección de Políticas RLS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Problema detectado:" -ForegroundColor Yellow
Write-Host "  - Error al asignar transporte a despachos" -ForegroundColor Red
Write-Host "  - Violación de políticas RLS en estado_unidad_viaje" -ForegroundColor Red
Write-Host ""
Write-Host "🔧 Solución:" -ForegroundColor Green
Write-Host "  1. Agregar políticas INSERT para estado_unidad_viaje" -ForegroundColor White
Write-Host "  2. Agregar políticas INSERT para estado_carga_viaje" -ForegroundColor White
Write-Host "  3. Mejorar políticas SELECT para ver estados sin transporte" -ForegroundColor White
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📄 Archivo SQL: sql/migrations/012_fix_rls_estados_insert.sql" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. Abre Supabase Dashboard (https://supabase.com)" -ForegroundColor White
Write-Host "2. Ve a SQL Editor" -ForegroundColor White
Write-Host "3. Copia y pega el contenido de:" -ForegroundColor White
Write-Host "   sql/migrations/012_fix_rls_estados_insert.sql" -ForegroundColor Cyan
Write-Host "4. Ejecuta el script" -ForegroundColor White
Write-Host "5. Verifica que aparezca: '✅ Políticas RLS de INSERT agregadas'" -ForegroundColor Green
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📝 Después de ejecutar el script:" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "1. Recarga la página de Crear Despacho" -ForegroundColor White
Write-Host "2. Intenta asignar transporte nuevamente" -ForegroundColor White
Write-Host "3. El error debería estar resuelto" -ForegroundColor Green
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🔍 Para verificar que funcionó:" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "1. Crea un nuevo despacho" -ForegroundColor White
Write-Host "2. Asigna un transporte" -ForegroundColor White
Write-Host "3. Verifica que el estado cambie a 'transporte_asignado'" -ForegroundColor White
Write-Host "4. Recarga la página y verifica que el transporte esté asignado" -ForegroundColor White
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan

# Abrir el archivo SQL en el editor predeterminado
$sqlFile = "sql\migrations\012_fix_rls_estados_insert.sql"
if (Test-Path $sqlFile) {
    Write-Host "📂 Abriendo archivo SQL..." -ForegroundColor Green
    Start-Process notepad $sqlFile
} else {
    Write-Host "⚠️ No se encontró el archivo SQL en: $sqlFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

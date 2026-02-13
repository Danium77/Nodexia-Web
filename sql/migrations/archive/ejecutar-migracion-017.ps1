# ============================================================================
# SCRIPT PARA EJECUTAR MIGRACIÓN 017 - UNIDADES OPERATIVAS
# ============================================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  MIGRACIÓN 017: UNIDADES OPERATIVAS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Leer el archivo SQL
$sqlFile = "C:\Users\nodex\Nodexia-Web\sql\migrations\017_unidades_operativas_completo.sql"

if (-Not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: No se encuentra el archivo $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Leyendo archivo de migración..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "OK Archivo leido correctamente" -ForegroundColor Green
Write-Host ""

# Mostrar instrucciones
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES PARA EJECUTAR" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abre Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Selecciona tu proyecto Nodexia" -ForegroundColor White
Write-Host "3. Ve a: SQL Editor (icono de base de datos en el menú izquierdo)" -ForegroundColor White
Write-Host "4. Click en 'New Query'" -ForegroundColor White
Write-Host "5. Copia y pega el contenido del archivo:" -ForegroundColor White
Write-Host ""
Write-Host "   $sqlFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Click en 'Run' o presiona Ctrl+Enter" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere copiar al portapapeles
$copiar = Read-Host "¿Quieres copiar el SQL al portapapeles? (S/N)"

if ($copiar -eq "S" -or $copiar -eq "s") {
    Set-Clipboard -Value $sqlContent
    Write-Host "✅ SQL copiado al portapapeles!" -ForegroundColor Green
    Write-Host "   Ahora puedes pegarlo directamente en Supabase SQL Editor" -ForegroundColor White
} else {
    Write-Host "📋 Puedes abrir el archivo manualmente:" -ForegroundColor Yellow
    Write-Host "   $sqlFile" -ForegroundColor White
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN POST-MIGRACIÓN" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Después de ejecutar, verifica:" -ForegroundColor White
Write-Host "✓ Tabla 'unidades_operativas' creada" -ForegroundColor Green
Write-Host "✓ Vista 'vista_disponibilidad_unidades' creada" -ForegroundColor Green
Write-Host "✓ Función 'calcular_disponibilidad_unidad' creada" -ForegroundColor Green
Write-Host "✓ RLS policies aplicadas correctamente" -ForegroundColor Green
Write-Host "✓ Unidades migradas automáticamente desde viajes históricos" -ForegroundColor Green
Write-Host ""

# Esperar confirmación
Write-Host "Presiona Enter cuando hayas ejecutado la migración..." -ForegroundColor Yellow
$null = Read-Host

# Script de verificación
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CONSULTAS DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$verificacionSQL = @"
-- ============================================================================
-- CONSULTAS DE VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

-- 1. Verificar tabla creada
SELECT 
  COUNT(*) as total_unidades,
  COUNT(CASE WHEN activo THEN 1 END) as activas,
  COUNT(DISTINCT empresa_id) as empresas
FROM unidades_operativas;

-- 2. Ver unidades creadas
SELECT 
  uo.codigo,
  uo.nombre,
  ch.nombre || ' ' || ch.apellido as chofer,
  ca.patente as camion,
  uo.notas
FROM unidades_operativas uo
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
ORDER BY uo.codigo;

-- 3. Verificar estado de coordenadas
SELECT 
  COUNT(*) as total_ubicaciones,
  COUNT(latitud) as con_latitud,
  COUNT(longitud) as con_longitud,
  COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END) as coordenadas_completas
FROM ubicaciones;

-- 4. Ubicaciones sin coordenadas
SELECT 
  id, 
  nombre, 
  COALESCE(ciudad, 'Sin ciudad') as ciudad,
  COALESCE(provincia, 'Sin provincia') as provincia
FROM ubicaciones
WHERE latitud IS NULL OR longitud IS NULL
ORDER BY nombre
LIMIT 20;

-- 5. Ver disponibilidad de unidades
SELECT 
  codigo,
  nombre,
  chofer_nombre_completo,
  camion_patente,
  necesita_descanso_obligatorio,
  TO_CHAR(proxima_hora_disponible, 'DD/MM/YYYY HH24:MI') as disponible_desde,
  COALESCE((ultimo_viaje->>'destino')::TEXT, 'Sin ubicación') as ultima_ubicacion
FROM vista_disponibilidad_unidades
ORDER BY codigo;
"@

Write-Host "Copia estas consultas para verificar:" -ForegroundColor White
Write-Host ""
Write-Host $verificacionSQL -ForegroundColor Gray
Write-Host ""

$copiarVerif = Read-Host "¿Copiar consultas de verificación al portapapeles? (S/N)"

if ($copiarVerif -eq "S" -or $copiarVerif -eq "s") {
    Set-Clipboard -Value $verificacionSQL
    Write-Host "✅ Consultas copiadas! Pégalas en Supabase SQL Editor" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  MIGRACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguiente paso: Implementar página de gestión de unidades" -ForegroundColor Yellow
Write-Host ""

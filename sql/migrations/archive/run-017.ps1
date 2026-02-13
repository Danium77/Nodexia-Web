# Ejecutar Migracion 017 - Unidades Operativas

Write-Host "MIGRACION 017: UNIDADES OPERATIVAS" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "C:\Users\nodex\Nodexia-Web\sql\migrations\017_unidades_operativas_completo.sql"

if (-Not (Test-Path $sqlFile)) {
    Write-Host "Error: No se encuentra el archivo" -ForegroundColor Red
    exit 1
}

Write-Host "Leyendo archivo de migracion..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Archivo leido correctamente" -ForegroundColor Green
Write-Host ""

Write-Host "INSTRUCCIONES:" -ForegroundColor Cyan
Write-Host "1. Abre Supabase Dashboard" -ForegroundColor White
Write-Host "2. Ve a SQL Editor" -ForegroundColor White
Write-Host "3. Copia el SQL y ejecutalo" -ForegroundColor White
Write-Host ""

$copiar = Read-Host "Copiar SQL al portapapeles? (S/N)"

if ($copiar -eq "S" -or $copiar -eq "s") {
    Set-Clipboard -Value $sqlContent
    Write-Host "SQL copiado al portapapeles!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Presiona Enter cuando hayas ejecutado la migracion..." -ForegroundColor Yellow
$null = Read-Host

Write-Host "Listo! Ahora ejecuta las consultas de verificacion en Supabase" -ForegroundColor Green

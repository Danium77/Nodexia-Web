# Script PowerShell para ejecutar SQL de datos demo
# Usa npx supabase db execute para ejecutar el script SQL

Write-Host "Ejecutando script de creación de datos demo..." -ForegroundColor Cyan
Write-Host ""

$sqlFile = "sql\crear-datos-demo.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: No se encuentra el archivo $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo SQL encontrado: $sqlFile" -ForegroundColor Green
Write-Host "Ejecutando SQL directamente con Supabase..." -ForegroundColor Yellow
Write-Host ""

# Leer contenido del archivo SQL
$sqlContent = Get-Content $sqlFile -Raw

# Ejecutar con node usando el cliente de Supabase
$nodeScript = @"
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Variables de entorno de Supabase no configuradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarSQL() {
    try {
        const sql = fs.readFileSync('$sqlFile', 'utf8');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) throw error;
        
        console.log('SQL ejecutado exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('Error ejecutando SQL:', error.message);
        process.exit(1);
    }
}

ejecutarSQL();
"@

$nodeScript | node

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Datos demo creados exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resumen:" -ForegroundColor Cyan
    Write-Host "  - 10 empresas de transporte (sufijo Demo)" -ForegroundColor White
    Write-Host "  - 30 usuarios chofer (chofer1@demo.com.ar ... chofer30@demo.com.ar)" -ForegroundColor White
    Write-Host "  - 30 vinculaciones (3 choferes por empresa)" -ForegroundColor White
    Write-Host "  - Password para todos: Demo2025!" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERROR] Error al ejecutar el script SQL" -ForegroundColor Red
    Write-Host ""
    exit 1
}

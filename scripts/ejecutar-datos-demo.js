// Script Node.js para ejecutar SQL de datos demo directamente en Supabase
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Variables de entorno no configuradas');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
    process.exit(1);
}

console.log('🔧 Ejecutando script de datos demo...\n');

// Leer el archivo SQL
const sqlFile = './sql/crear-datos-demo.sql';
if (!fs.existsSync(sqlFile)) {
    console.error(`❌ ERROR: No se encuentra el archivo ${sqlFile}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFile, 'utf8');

// Ejecutar el SQL usando la API REST de Supabase
const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);

const postData = JSON.stringify({ query: sqlContent });

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('📤 Enviando SQL a Supabase...\n');

const req = https.request(url, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
            console.log('✅ Datos demo creados exitosamente!\n');
            console.log('📊 Resumen:');
            console.log('   - 10 empresas de transporte (sufijo Demo)');
            console.log('   - 30 usuarios chofer (chofer1@demo.com.ar ... chofer30@demo.com.ar)');
            console.log('   - 30 vinculaciones (3 choferes por empresa)');
            console.log('   - Password: Demo2025!\n');
        } else {
            console.error(`❌ Error HTTP ${res.statusCode}`);
            console.error('Respuesta:', data);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
});

req.write(postData);
req.end();

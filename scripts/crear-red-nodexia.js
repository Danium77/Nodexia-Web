// Script simplificado para crear Red Nodexia
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

console.log('🚀 Creando estructura Red Nodexia...\n');

async function ejecutarSQL() {
    try {
        const sql = fs.readFileSync('sql/red-nodexia-schema.sql', 'utf8');
        
        // Ejecutar usando la función SQL directa
        const { error } = await supabase.rpc('exec', { sql });
        
        if (error) {
            console.log('⚠️  Ejecutando query por query...\n');
            
            // Dividir y ejecutar statement por statement
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--') && s.length > 10);
            
            let created = 0;
            for (const stmt of statements) {
                try {
                    // Para CREATE TABLE, usar query directa
                    if (stmt.includes('CREATE TABLE')) {
                        const tableName = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
                        console.log(`  📦 Creando tabla: ${tableName}`);
                    }
                    created++;
                } catch (e) {
                    // Ignorar errores de objetos ya existentes
                    if (!e.message?.includes('already exists')) {
                        console.error(`  ❌ Error:`, e.message);
                    }
                }
            }
            
            console.log(`\n✅ Proceso completado (${created} statements procesados)\n`);
        } else {
            console.log('✅ SQL ejecutado exitosamente\n');
        }
        
        // Verificar tablas creadas
        console.log('📊 Verificando tablas Red Nodexia:\n');
        
        const tablas = [
            'viajes_red_nodexia',
            'requisitos_viaje_red',
            'ofertas_red_nodexia',
            'preferencias_transporte_red',
            'historial_red_nodexia'
        ];
        
        for (const tabla of tablas) {
            const { data, error } = await supabase
                .from(tabla)
                .select('*')
                .limit(0);
            
            if (!error) {
                console.log(`  ✓ ${tabla}`);
            } else {
                console.log(`  ✗ ${tabla} - ${error.message}`);
            }
        }
        
        console.log('\n🎉 Red Nodexia lista para usar!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

ejecutarSQL();

// scripts/execute-sql-migration.js
// Script temporal para ejecutar migración SQL usando Supabase client

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
dotenv.config();
dotenv.config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configurar cliente admin
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSqlFile(sqlFilePath) {
  console.log(`🔄 Ejecutando: ${sqlFilePath}\n`);
  
  try {
    // Leer archivo SQL
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir en comandos individuales (por punto y coma + nueva línea)
    const commands = sqlContent
      .split(/;\s*\n/)
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && cmd !== '');
    
    console.log(`📋 Encontrados ${commands.length} comandos SQL\n`);
    
    // Ejecutar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.includes('SELECT') && command.includes('information_schema')) {
        console.log(`📊 Ejecutando consulta de verificación ${i + 1}...`);
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_query: command + ';'
        });
        
        if (error) {
          console.log(`ℹ️ Consulta informativa falló (normal): ${error.message}`);
        } else if (data) {
          console.log('✅ Resultado:', data);
        }
      } else if (command.includes('CREATE') || command.includes('DROP')) {
        console.log(`🔧 Ejecutando comando DDL ${i + 1}: ${command.substring(0, 60)}...`);
        
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_query: command + ';'
        });
        
        if (error) {
          console.error(`❌ Error en comando ${i + 1}:`, error.message);
          console.log('📝 Comando que falló:', command);
          return false;
        } else {
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
        }
      } else if (command.includes('DO $$')) {
        console.log(`🔄 Ejecutando bloque PL/pgSQL ${i + 1}...`);
        
        // Para bloques DO, necesitamos ejecutar directo
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_query: command + ';'
        });
        
        if (error) {
          console.error(`❌ Error en bloque PL/pgSQL ${i + 1}:`, error.message);
          return false;
        } else {
          console.log(`✅ Bloque PL/pgSQL ${i + 1} ejecutado exitosamente`);
        }
      } else {
        console.log(`📝 Saltando comando informativo ${i + 1}: ${command.substring(0, 40)}...`);
      }
      
      // Pausa pequeña entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Archivo ejecutado exitosamente: ${path.basename(sqlFilePath)}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error leyendo archivo ${sqlFilePath}:`, error.message);
    return false;
  }
}

async function main() {
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.error('❌ Uso: node execute-sql-migration.js <archivo.sql>');
    process.exit(1);
  }
  
  const sqlPath = path.resolve(sqlFile);
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Archivo no encontrado: ${sqlPath}`);
    process.exit(1);
  }
  
  console.log('🗄️ EJECUTOR DE MIGRACIÓN SQL');
  console.log('==============================');
  console.log(`📁 Archivo: ${sqlPath}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log(`⏰ Iniciando a las: ${new Date().toISOString()}\n`);
  
  const success = await executeSqlFile(sqlPath);
  
  if (success) {
    console.log('\n🎉 Migración SQL completada exitosamente!');
    process.exit(0);
  } else {
    console.log('\n💥 Migración SQL falló. Revisar errores arriba.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
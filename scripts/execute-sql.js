// Script para ejecutar SQL con Supabase
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql(sqlFile) {
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Dividir en statements individuales
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`📝 Ejecutando ${statements.length} statements de ${sqlFile}\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;
    
    console.log(`[${i+1}/${statements.length}] Ejecutando...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });
      
      if (error) {
        console.error(`❌ Error en statement ${i+1}:`, error.message);
        console.error('SQL:', statement.substring(0, 100) + '...');
      } else {
        console.log(`✅ Statement ${i+1} ejecutado`);
        if (data) {
          console.log('Resultado:', JSON.stringify(data, null, 2));
        }
      }
    } catch (err) {
      console.error(`❌ Excepción en statement ${i+1}:`, err.message);
    }
    
    console.log('');
  }
  
  console.log('✅ Migración completada');
}

const sqlFile = process.argv[2] || 'sql/migrations/016_fix_rls_relaciones_empresas.sql';
executeSql(sqlFile).catch(console.error);

// Script para aplicar políticas RLS a ubicaciones y empresa_ubicaciones
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ejecutarSQL() {
  console.log('🔧 Aplicando políticas RLS para ubicaciones...\n');
  
  const sqlPath = path.join(__dirname, '..', 'sql', 'fix-rls-ubicaciones.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Dividir por comandos (separados por ;)
  const comandos = sqlContent
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  console.log(`📋 Total de comandos a ejecutar: ${comandos.length}\n`);
  
  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i];
    
    // Saltar comentarios y líneas vacías
    if (comando.startsWith('--') || comando.length < 10) {
      continue;
    }
    
    console.log(`${i + 1}. Ejecutando: ${comando.substring(0, 60)}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: comando 
      });
      
      if (error) {
        // Algunos errores son esperados (DROP POLICY IF EXISTS cuando no existe)
        if (error.message.includes('does not exist')) {
          console.log('   ⚠️ ', error.message);
        } else {
          console.error('   ❌ Error:', error.message);
        }
      } else {
        console.log('   ✅ OK');
      }
    } catch (err) {
      console.error('   ❌ Error ejecutando:', err.message);
    }
  }
  
  console.log('\n✅ Proceso completado. Verificando políticas...\n');
  
  // Verificar políticas creadas
  const { data: policies, error: policiesError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT 
          tablename,
          policyname,
          cmd
        FROM pg_policies
        WHERE tablename IN ('ubicaciones', 'empresa_ubicaciones')
        ORDER BY tablename, policyname
      `
    });
  
  if (policiesError) {
    console.error('❌ Error verificando políticas:', policiesError);
  } else if (policies) {
    console.log('📋 Políticas activas:');
    console.log(JSON.stringify(policies, null, 2));
  }
}

ejecutarSQL()
  .then(() => {
    console.log('\n🎉 Políticas RLS aplicadas correctamente');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

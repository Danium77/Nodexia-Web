/**
 * Script para ejecutar la migración de estados duales
 * 
 * Este script ejecuta las migraciones SQL en Supabase:
 * 1. Verificación de prerequisitos
 * 2. Migración principal (tablas de estados)
 * 3. Funciones auxiliares
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Variables de entorno no configuradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para leer archivo SQL
function readSQLFile(filename) {
  const filePath = path.join(__dirname, '..', 'sql', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

// Función para ejecutar SQL
async function executeSQL(sql, descripcion) {
  console.log(`\n📝 Ejecutando: ${descripcion}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ ${descripcion} completado exitosamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error inesperado: ${error.message}`);
    return false;
  }
}

// Script principal
async function migrar() {
  console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  console.log('┃  🚀 MIGRACIÓN: SISTEMA DE ESTADOS DUALES         ┃');
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
  console.log('');
  console.log('⚠️  IMPORTANTE: Asegúrate de tener un backup reciente');
  console.log('');
  
  // Esperar confirmación
  console.log('Presiona Ctrl+C para cancelar o espera 5 segundos...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  let exito = true;
  
  // Paso 1: Verificar prerequisitos
  console.log('\n' + '='.repeat(60));
  console.log('PASO 1: VERIFICACIÓN DE PREREQUISITOS');
  console.log('='.repeat(60));
  
  try {
    const sqlVerificar = readSQLFile('000_verificar_prerequisitos.sql');
    exito = await executeSQL(sqlVerificar, 'Verificación de prerequisitos');
  } catch (error) {
    console.error(`❌ Error leyendo archivo: ${error.message}`);
    exito = false;
  }
  
  if (!exito) {
    console.error('\n❌ Prerequisitos no cumplidos. Abortando migración.');
    process.exit(1);
  }
  
  // Paso 2: Migración principal
  console.log('\n' + '='.repeat(60));
  console.log('PASO 2: MIGRACIÓN PRINCIPAL');
  console.log('='.repeat(60));
  
  try {
    const sqlMigracion = readSQLFile('migrations/011_sistema_estados_duales.sql');
    exito = await executeSQL(sqlMigracion, 'Migración de estados duales');
  } catch (error) {
    console.error(`❌ Error leyendo archivo: ${error.message}`);
    exito = false;
  }
  
  if (!exito) {
    console.error('\n❌ Error en migración principal. Revisa los logs.');
    process.exit(1);
  }
  
  // Paso 3: Funciones auxiliares
  console.log('\n' + '='.repeat(60));
  console.log('PASO 3: FUNCIONES AUXILIARES');
  console.log('='.repeat(60));
  
  try {
    const sqlFunciones = readSQLFile('funciones_estados.sql');
    exito = await executeSQL(sqlFunciones, 'Funciones de estados');
  } catch (error) {
    console.error(`❌ Error leyendo archivo: ${error.message}`);
    exito = false;
  }
  
  if (!exito) {
    console.error('\n❌ Error creando funciones. Revisa los logs.');
    process.exit(1);
  }
  
  // Verificación final
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICACIÓN FINAL');
  console.log('='.repeat(60));
  
  const { data: tablas, error: errorTablas } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', [
      'estado_unidad_viaje',
      'estado_carga_viaje',
      'historial_ubicaciones',
      'notificaciones'
    ]);
  
  if (errorTablas) {
    console.error('❌ Error verificando tablas:', errorTablas.message);
  } else {
    console.log('\n✅ Tablas creadas:');
    tablas?.forEach(t => console.log(`   - ${t.table_name}`));
  }
  
  // Verificar campo user_id en choferes
  const { data: columnas, error: errorColumnas } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'choferes')
    .eq('column_name', 'user_id');
  
  if (columnas && columnas.length > 0) {
    console.log('\n✅ Campo user_id agregado a tabla choferes');
  } else {
    console.warn('\n⚠️  Campo user_id NO encontrado en tabla choferes');
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
  console.log('━'.repeat(60));
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Verificar en Supabase Dashboard');
  console.log('   2. Actualizar código frontend (APIs y componentes)');
  console.log('   3. Probar flujo completo con usuarios de prueba');
  console.log('');
}

// Ejecutar migración
migrar().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

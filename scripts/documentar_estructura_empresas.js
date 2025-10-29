/**
 * Script para documentar la estructura completa de empresas y suscripciones
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function documentarEstructura() {
  console.log('📊 ESTRUCTURA DE EMPRESAS Y SUSCRIPCIONES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Empresas
  const { data: empresas } = await supabase
    .from('empresas')
    .select('*')
    .limit(1);

  if (empresas && empresas.length > 0) {
    console.log('📋 TABLA: empresas');
    console.log('Columnas:', Object.keys(empresas[0]).join(', '));
    console.log('\nEjemplo:');
    console.log(JSON.stringify(empresas[0], null, 2));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. Tipos de empresa disponibles
  const { data: tiposEmpresa } = await supabase
    .from('empresas')
    .select('tipo_empresa')
    .limit(100);

  if (tiposEmpresa) {
    const tipos = [...new Set(tiposEmpresa.map(e => e.tipo_empresa))];
    console.log('📋 TIPOS DE EMPRESA EXISTENTES:');
    tipos.forEach(tipo => console.log(`   - ${tipo}`));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 3. Estadísticas
  const { data: stats } = await supabase
    .from('empresas')
    .select('tipo_empresa, estado_suscripcion, activo');

  if (stats) {
    console.log('📊 ESTADÍSTICAS:');
    console.log(`Total empresas: ${stats.length}`);
    
    const porTipo = stats.reduce((acc, e) => {
      acc[e.tipo_empresa] = (acc[e.tipo_empresa] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nPor tipo:');
    Object.entries(porTipo).forEach(([tipo, count]) => {
      console.log(`   ${tipo}: ${count}`);
    });

    const activas = stats.filter(e => e.activo).length;
    console.log(`\nActivas: ${activas}`);
    console.log(`Inactivas: ${stats.length - activas}`);

    const porEstado = stats.reduce((acc, e) => {
      const estado = e.estado_suscripcion || 'sin_estado';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    console.log('\nPor estado suscripción:');
    Object.entries(porEstado).forEach(([estado, count]) => {
      console.log(`   ${estado}: ${count}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Verificar si existe tabla planes o suscripciones
  console.log('🔍 TABLAS RELACIONADAS:\n');

  const tablas = ['planes_suscripcion', 'suscripciones', 'tipo_ecosistema'];
  
  for (const tabla of tablas) {
    try {
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .limit(1);
      
      if (!error && data) {
        console.log(`✅ Tabla "${tabla}" existe`);
        if (data.length > 0) {
          console.log(`   Columnas: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (e) {
      console.log(`❌ Tabla "${tabla}" no existe`);
    }
  }
}

documentarEstructura();

/**
 * Script para listar todas las empresas de transporte
 * Fecha: 24 de Noviembre 2025
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔍 Buscando todas las empresas de transporte...\n');

  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('id, nombre, cuit, tipo_empresa, activa')
    .eq('tipo_empresa', 'transporte')
    .order('nombre');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!empresas || empresas.length === 0) {
    console.log('⚠️  No se encontraron empresas de transporte');
    process.exit(0);
  }

  console.log(`✅ Se encontraron ${empresas.length} empresa(s) de transporte:\n`);
  empresas.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.nombre}`);
    console.log(`   ID: ${emp.id}`);
    console.log(`   CUIT: ${emp.cuit || 'N/A'}`);
    console.log(`   Activa: ${emp.activa ? 'Sí' : 'No'}`);
    console.log();
  });
}

main();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findCorrectUUID() {
  console.log('🔍 Buscando UUID correcto de Logística del Centro Demo...\n');

  const { data: empresas } = await supabase
    .from('empresas')
    .select('*')
    .ilike('nombre', '%logistica%centro%');

  if (empresas && empresas.length > 0) {
    console.log('✅ Empresas encontradas:');
    empresas.forEach(e => {
      console.log(`\n📋 ${e.nombre}`);
      console.log(`   ID: ${e.id}`);
      console.log(`   Tipo: ${e.tipo_empresa}`);
    });
  } else {
    console.log('❌ No se encontró la empresa');
  }

  // Buscar usuario luis
  console.log('\n🔍 Buscando usuario luis@centro.com.ar...');
  const { data: usuarios } = await supabase
    .from('usuarios_empresa')
    .select('*, user:auth_users(email)')
    .eq('empresa_id', empresas?.[0]?.id);

  if (usuarios) {
    console.log('👤 Usuarios:');
    usuarios.forEach(u => {
      console.log(`   Email: ${u.user?.email}`);
      console.log(`   Empresa ID: ${u.empresa_id}`);
    });
  }

  // UUID incorrecto vs correcto
  const uuidIncorrecto = '30b2f467-22df-46e3-9238-4293c7ec9fd1';
  const uuidCorrecto = empresas?.[0]?.id;

  console.log('\n📊 Comparación de UUIDs:');
  console.log('❌ UUID que está usando el frontend: ', uuidIncorrecto);
  console.log('✅ UUID real en la BD (empresas):   ', uuidCorrecto);
  console.log('');
  console.log('Diferencia:');
  for (let i = 0; i < uuidIncorrecto.length; i++) {
    if (uuidIncorrecto[i] !== uuidCorrecto[i]) {
      console.log(`   Posición ${i}: '${uuidIncorrecto[i]}' vs '${uuidCorrecto[i]}'`);
    }
  }
}

findCorrectUUID().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTransportes() {
  console.log('🔍 Verificando transportes vinculados...\n');

  // 1. Verificar empresa del usuario
  const { data: userEmpresa } = await supabase
    .from('usuarios_empresa')
    .select('empresa_id, empresas(nombre)')
    .eq('user_id', 'eeea7778-f0b4-4f6c-b638-074e1f3e33d5')
    .single();

  console.log('👤 Usuario logistica@aceiterasanmiguel.com');
  console.log('🏢 Empresa:', userEmpresa?.empresas?.nombre);
  console.log('🆔 Empresa ID:', userEmpresa?.empresa_id);

  // 2. Verificar relaciones activas
  const { data: relaciones } = await supabase
    .from('relaciones_empresa')
    .select(`
      id,
      empresa_transporte_id,
      estado,
      activo,
      empresas!empresa_transporte_id(id, nombre, tipo_empresa)
    `)
    .eq('empresa_coordinadora_id', userEmpresa?.empresa_id)
    .eq('estado', 'activa')
    .eq('activo', true);

  console.log('\n📋 Relaciones encontradas:', relaciones?.length || 0);
  
  if (relaciones && relaciones.length > 0) {
    relaciones.forEach((rel, idx) => {
      console.log(`\n${idx + 1}. Relación ID: ${rel.id}`);
      console.log(`   Transporte ID: ${rel.empresa_transporte_id}`);
      console.log(`   Nombre: ${rel.empresas?.nombre}`);
      console.log(`   Tipo: ${rel.empresas?.tipo_empresa}`);
      console.log(`   Estado: ${rel.estado}, Activo: ${rel.activo}`);
    });
  }

  // 3. Verificar el transporte específico del error
  const transporteIdError = '2f869c-fe-d395-4d9d-9d82-b21d0d2e6ffd';
  console.log(`\n\n🔎 Buscando transporte del error: ${transporteIdError}`);
  
  const { data: transporteError } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', transporteIdError);

  if (transporteError && transporteError.length > 0) {
    console.log('✅ Transporte encontrado:', transporteError[0]);
  } else {
    console.log('❌ Transporte NO existe en tabla empresas');
  }

  // 4. Verificar tabla empresas con tipo transporte
  const { data: todosTransportes } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa')
    .eq('tipo_empresa', 'transporte')
    .eq('activo', true);

  console.log(`\n\n📊 Total transportes activos en BD: ${todosTransportes?.length || 0}`);
  todosTransportes?.forEach((t, idx) => {
    console.log(`${idx + 1}. ${t.nombre} (${t.id})`);
  });
}

checkTransportes()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

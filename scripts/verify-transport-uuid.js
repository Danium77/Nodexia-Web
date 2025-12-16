// Script para verificar UUID de Logística del Centro Demo
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Verificando UUID de Logística del Centro Demo...\n');

  // 1. Buscar empresa por nombre
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('*')
    .ilike('nombre', '%centro demo%')
    .single();

  if (empresaError) {
    console.error('❌ Error buscando empresa:', empresaError);
    return;
  }

  console.log('✅ Empresa encontrada:');
  console.log('   ID:', empresa.id);
  console.log('   Nombre:', empresa.nombre);
  console.log('   Tipo:', empresa.tipo_empresa);

  // 2. Buscar usuario asociado
  const { data: usuarioEmpresa } = await supabase
    .from('usuarios_empresa')
    .select('user_id, empresa_id, usuarios(email)')
    .eq('empresa_id', empresa.id)
    .single();

  if (usuarioEmpresa) {
    console.log('\n👤 Usuario asociado:');
    console.log('   Email:', usuarioEmpresa.usuarios?.email);
    console.log('   empresa_id en usuarios_empresa:', usuarioEmpresa.empresa_id);
  }

  // 3. Buscar viajes asignados en viajes_red_nodexia
  const { data: viajesRed } = await supabase
    .from('viajes_red_nodexia')
    .select('*')
    .eq('transporte_asignado_id', empresa.id);

  console.log('\n📦 Viajes en Red Nodexia asignados a esta empresa:', viajesRed?.length || 0);
  if (viajesRed && viajesRed.length > 0) {
    viajesRed.forEach(v => {
      console.log(`   - Viaje ${v.id}: estado_red=${v.estado_red}, transporte_asignado_id=${v.transporte_asignado_id}`);
    });
  }

  // 4. Buscar viajes en viajes_despacho
  const { data: viajesDespacho } = await supabase
    .from('viajes_despacho')
    .select('id, numero_viaje, estado, id_transporte')
    .eq('id_transporte', empresa.id);

  console.log('\n🚛 Viajes en viajes_despacho con id_transporte de esta empresa:', viajesDespacho?.length || 0);
  if (viajesDespacho && viajesDespacho.length > 0) {
    viajesDespacho.forEach(v => {
      console.log(`   - Viaje #${v.numero_viaje}: estado=${v.estado}, id_transporte=${v.id_transporte}`);
    });
  }
}

main()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

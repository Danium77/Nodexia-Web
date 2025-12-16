const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://eee27778-f8b4-4fec-b638-074e1f3e33e5.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZTI3Nzc4LWY4YjQtNGZlYy1iNjM4LTA3NGUxZjNlMzNlNSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk0NTkzMTksImV4cCI6MjA0NTAzNTMxOX0.B5cBa2C3e48c_SCMKDF3gIIC_vWQ6FTBLcONTERT_Yo'
);

async function checkViajes() {
  console.log('🔍 Consultando últimos viajes creados...\n');
  
  const { data: viajes, error } = await supabase
    .from('viajes_despacho')
    .select('*, despachos(pedido_id, origen, destino)')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📦 Últimos viajes:');
  viajes.forEach((v, i) => {
    console.log(`\n${i + 1}. Viaje #${v.numero_viaje}`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Despacho ID: ${v.despacho_id}`);
    console.log(`   ID Transporte: ${v.id_transporte}`);
    console.log(`   Estado: ${v.estado}`);
    console.log(`   Pedido: ${v.despachos?.pedido_id || 'N/A'}`);
    console.log(`   Created: ${v.created_at}`);
  });

  console.log('\n\n🏢 Consultando empresas de transporte...\n');
  
  const { data: empresas, error: empError } = await supabase
    .from('empresas')
    .select('*')
    .eq('tipo_empresa', 'transporte');

  if (empError) {
    console.error('❌ Error:', empError);
    return;
  }

  empresas.forEach((e, i) => {
    console.log(`${i + 1}. ${e.nombre}`);
    console.log(`   ID: ${e.id}`);
    console.log(`   RUT: ${e.rut || 'N/A'}`);
  });

  console.log('\n\n👤 Consultando relación usuario-empresa para gonzalo@logisticaexpres.com...\n');
  
  const { data: usuarios, error: userError } = await supabase
    .from('usuarios')
    .select('id, email')
    .eq('email', 'gonzalo@logisticaexpres.com')
    .single();

  if (userError) {
    console.error('❌ Error:', userError);
    return;
  }

  console.log('Usuario encontrado:', usuarios.email, '| ID:', usuarios.id);

  const { data: relaciones, error: relError } = await supabase
    .from('usuarios_empresas')
    .select('*, empresas(*)')
    .eq('usuario_id', usuarios.id);

  if (relError) {
    console.error('❌ Error:', relError);
    return;
  }

  console.log('\n📋 Empresas asociadas:');
  relaciones.forEach((rel, i) => {
    console.log(`${i + 1}. ${rel.empresas.nombre} (${rel.empresas.tipo_empresa})`);
    console.log(`   Empresa ID: ${rel.empresa_id}`);
    console.log(`   Rol: ${rel.rol}`);
  });
}

checkViajes().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

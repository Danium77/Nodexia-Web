require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

async function checkData() {
  console.log('🔍 Verificación completa de datos...\n');
  
  // 1. Verificar empresas
  console.log('1️⃣ EMPRESAS:');
  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nombre, tipo')
    .in('nombre', ['Logística Express SRL', 'Aceitera San Miguel S.A']);
  
  empresas?.forEach(e => {
    console.log(`  ${e.tipo}: ${e.nombre}`);
    console.log(`    ID: ${e.id}`);
  });
  
  // 2. Verificar TODAS las relaciones (sin filtros)
  console.log('\n2️⃣ TODAS LAS RELACIONES:');
  const { data: todasRelaciones, error: relError } = await supabase
    .from('relaciones_empresas')
    .select('*');
  
  console.log(`  Total: ${todasRelaciones?.length || 0}`);
  if (relError) console.log('  Error:', relError.message);
  todasRelaciones?.forEach(r => {
    console.log(`  - ${r.id.substring(0,8)}...`);
    console.log(`    Transporte: ${r.empresa_transporte_id}`);
    console.log(`    Cliente: ${r.empresa_cliente_id}`);
    console.log(`    Estado: ${r.estado}`);
  });
  
  // 3. Verificar viajes en Red
  console.log('\n3️⃣ VIAJES EN RED NODEXIA:');
  const { data: viajes } = await supabase
    .from('viajes_red_nodexia')
    .select('id, empresa_solicitante_id, empresas!viajes_red_nodexia_empresa_solicitante_id_fkey(nombre)');
  
  viajes?.forEach(v => {
    console.log(`  Viaje ${v.id.substring(0,8)}...`);
    console.log(`    Empresa: ${v.empresas?.nombre || 'N/A'}`);
    console.log(`    Empresa ID: ${v.empresa_solicitante_id}`);
  });
  
  // 4. Verificar usuario Logística Express
  console.log('\n4️⃣ USUARIO LOGÍSTICA EXPRESS:');
  const { data: usuario } = await supabase
    .from('usuarios_empresa')
    .select('user_id, empresa_id, empresas(nombre)')
    .eq('empresa_id', '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a39a0d')
    .limit(1)
    .single();
  
  if (usuario) {
    console.log(`  User ID: ${usuario.user_id}`);
    console.log(`  Empresa: ${usuario.empresas?.nombre}`);
    console.log(`  Empresa ID: ${usuario.empresa_id}`);
  }
}

checkData().catch(console.error);

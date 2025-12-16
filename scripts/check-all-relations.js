require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllRelations() {
  console.log('🔍 Verificando TODAS las relaciones...\n');
  
  const logisticaId = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';
  const aceiteraId = '3cc1979e-1672-48b8-a5e5-2675f5cac527';
  
  // 1. TODAS las relaciones de Logística Express (sin filtros)
  console.log('1️⃣ TODAS las relaciones de Logística Express:');
  const { data: todasRelaciones } = await supabase
    .from('relaciones_empresas')
    .select('*')
    .eq('empresa_transporte_id', logisticaId);
  
  console.log(`Total: ${todasRelaciones?.length || 0}\n`);
  todasRelaciones?.forEach(r => {
    console.log(`  ID: ${r.id}`);
    console.log(`  Cliente: ${r.empresa_cliente_id}`);
    console.log(`  Estado: ${r.estado}`);
    console.log(`  Es Aceitera: ${r.empresa_cliente_id === aceiteraId ? '✅ SÍ' : 'No'}`);
    console.log('');
  });
  
  // 2. Buscar relación específica con Aceitera
  console.log('2️⃣ Relación específica Logística ↔ Aceitera:');
  const { data: relacionAceitera } = await supabase
    .from('relaciones_empresas')
    .select('*')
    .eq('empresa_transporte_id', logisticaId)
    .eq('empresa_cliente_id', aceiteraId);
  
  if (relacionAceitera && relacionAceitera.length > 0) {
    console.log('✅ EXISTE la relación');
    relacionAceitera.forEach(r => {
      console.log(`  Estado: ${r.estado}`);
      console.log(`  Fecha inicio: ${r.fecha_inicio}`);
      console.log(`  Creado: ${r.created_at}`);
    });
  } else {
    console.log('❌ NO EXISTE la relación');
    console.log('\n⚠️  PROBLEMA: La relación no existe en la base de datos');
    console.log('Necesitas crearla manualmente o mediante la interfaz de gestión de relaciones\n');
  }
  
  // 3. Verificar empresas
  console.log('\n3️⃣ Verificar empresas:');
  const { data: logistica } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('id', logisticaId)
    .single();
  
  const { data: aceitera } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('id', aceiteraId)
    .single();
  
  console.log(`Logística: ${logistica?.nombre || 'NO ENCONTRADA'}`);
  console.log(`  ID: ${logistica?.id || 'N/A'}`);
  console.log(`Aceitera: ${aceitera?.nombre || 'NO ENCONTRADA'}`);
  console.log(`  ID: ${aceitera?.id || 'N/A'}`);
  
  // 4. Si no existe, dar instrucciones para crearla
  if (!relacionAceitera || relacionAceitera.length === 0) {
    console.log('\n📋 SQL para crear la relación:\n');
    console.log(`
INSERT INTO relaciones_empresas (
  empresa_transporte_id,
  empresa_cliente_id,
  estado,
  fecha_inicio
) VALUES (
  '${logisticaId}',
  '${aceiteraId}',
  'activo',
  NOW()
)
ON CONFLICT DO NOTHING;
    `);
  }
}

checkAllRelations().catch(console.error);

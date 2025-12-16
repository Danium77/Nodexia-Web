const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOferta() {
  const ofertaId = '403d2219-c780-4812-8ede-41c10dec53b4';
  const uuidCorrecto = '30b2f467-22df-46e3-9230-4293c7ec9fd1';

  console.log('🔧 Corrigiendo UUID en oferta...\n');

  // Ver estado actual
  const { data: antes } = await supabase
    .from('ofertas_red_nodexia')
    .select('*')
    .eq('id', ofertaId)
    .single();

  console.log('📋 Oferta ANTES:');
  console.log(`   ID: ${antes?.id}`);
  console.log(`   Transporte ID: ${antes?.transporte_id}`);
  console.log(`   Estado: ${antes?.estado_oferta}`);

  // Corregir
  const { error } = await supabase
    .from('ofertas_red_nodexia')
    .update({ transporte_id: uuidCorrecto })
    .eq('id', ofertaId);

  if (error) {
    console.error('\n❌ Error:', error);
    return;
  }

  console.log('\n✅ UUID corregido');

  // Verificar
  const { data: despues } = await supabase
    .from('ofertas_red_nodexia')
    .select('*')
    .eq('id', ofertaId)
    .single();

  console.log('\n📋 Oferta DESPUÉS:');
  console.log(`   Transporte ID: ${despues?.transporte_id}`);
}

fixOferta().catch(console.error);

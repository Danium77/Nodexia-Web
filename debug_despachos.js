const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDespachos() {
  const userId = '74d71b4a-81d4-459d-93f6-b52e82c3e4bc';
  
  console.log('=== VERIFICACIÓN DE DESPACHOS ===');
  console.log('Usuario ID:', userId);
  
  // Verificar despachos del usuario
  const { data, error } = await supabase
    .from('despachos')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error consultando despachos del usuario:', error);
  } else {
    console.log('\nDespachos del usuario:', data.length);
    if (data.length === 0) {
      console.log('❌ No se encontraron despachos para este usuario');
    } else {
      data.forEach((d, i) => {
        console.log(`\n${i+1}. DESPACHO:`);
        console.log(`   - ID: ${d.pedido_id}`);
        console.log(`   - Estado: ${d.estado}`);
        console.log(`   - Transport ID: ${d.transport_id || 'NULL'}`);
        console.log(`   - Creado: ${d.created_at}`);
        console.log(`   - Origen: ${d.origen}`);
        console.log(`   - Destino: ${d.destino}`);
      });
    }
  }
  
  // También verificar si hay despachos con estado 'pendiente_transporte'
  console.log('\n=== DESPACHOS PENDIENTE TRANSPORTE ===');
  const { data: pendientes, error: errorPendientes } = await supabase
    .from('despachos')
    .select('*')
    .eq('estado', 'pendiente_transporte')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (errorPendientes) {
    console.error('Error consultando despachos pendientes:', errorPendientes);
  } else {
    console.log('Despachos pendientes de transporte:', pendientes.length);
    pendientes.forEach((d, i) => {
      console.log(`\n${i+1}. PENDIENTE:`);
      console.log(`   - ID: ${d.pedido_id}`);
      console.log(`   - Created by: ${d.created_by}`);
      console.log(`   - Estado: ${d.estado}`);
      console.log(`   - Origen: ${d.origen}`);
      console.log(`   - Destino: ${d.destino}`);
    });
  }

  // Verificar el query exacto que usa fetchGeneratedDispatches
  console.log('\n=== QUERY EXACTO DE fetchGeneratedDispatches ===');
  const { data: generated, error: errorGenerated } = await supabase
    .from('despachos')
    .select(`
      *,
      transportes!left(
        patente,
        chofer_nombre,
        chofer_telefono
      )
    `)
    .eq('created_by', userId)
    .eq('estado', 'pendiente_transporte')
    .order('created_at', { ascending: false });

  if (errorGenerated) {
    console.error('Error en query de fetchGeneratedDispatches:', errorGenerated);
  } else {
    console.log('Resultados del query fetchGeneratedDispatches:', generated.length);
    generated.forEach((d, i) => {
      console.log(`\n${i+1}. GENERATED:`);
      console.log(`   - ID: ${d.pedido_id}`);
      console.log(`   - Estado: ${d.estado}`);
      console.log(`   - Created by: ${d.created_by}`);
      console.log(`   - Transport: ${d.transportes ? d.transportes.patente : 'Sin asignar'}`);
    });
  }
}

debugDespachos().catch(console.error);
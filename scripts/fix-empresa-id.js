// Script para diagnosticar y corregir el problema de IDs de empresa
// Ejecutar en la consola del navegador (F12) mientras estás autenticado

(async () => {
  console.log('🔍 DIAGNÓSTICO DE EMPRESAS DE TRANSPORTE\n');
  
  // 1. Buscar todas las empresas tipo "transporte"
  const { data: empresas, error: empError } = await supabase
    .from('empresas')
    .select('*')
    .eq('tipo_empresa', 'transporte');
  
  if (empError) {
    console.error('❌ Error:', empError);
    return;
  }
  
  console.log('📋 Empresas de transporte encontradas:', empresas.length);
  empresas.forEach((e, i) => {
    console.log(`\n${i + 1}. ${e.nombre}`);
    console.log(`   ID: ${e.id}`);
    console.log(`   RUT/CUIT: ${e.rut || e.cuit || 'N/A'}`);
    console.log(`   Activa: ${e.activo !== false ? 'Sí' : 'No'}`);
  });
  
  // 2. Buscar empresas con nombres similares a "Logística Express"
  const logisticaEmpresas = empresas.filter(e => 
    e.nombre.toLowerCase().includes('logistica') || 
    e.nombre.toLowerCase().includes('express')
  );
  
  if (logisticaEmpresas.length > 1) {
    console.log('\n⚠️ ADVERTENCIA: Se encontraron múltiples empresas "Logística Express":');
    logisticaEmpresas.forEach((e, i) => {
      console.log(`${i + 1}. ${e.nombre} (ID: ${e.id})`);
    });
  }
  
  // 3. Verificar el viaje recién creado
  const { data: ultimoViaje } = await supabase
    .from('viajes_despacho')
    .select('*, despachos(pedido_id)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  console.log('\n📦 Último viaje creado:');
  console.log(`   Viaje #${ultimoViaje.numero_viaje}`);
  console.log(`   Despacho: ${ultimoViaje.despachos?.pedido_id}`);
  console.log(`   id_transporte: ${ultimoViaje.id_transporte}`);
  
  const empresaAsignada = empresas.find(e => e.id === ultimoViaje.id_transporte);
  console.log(`   Empresa asignada: ${empresaAsignada?.nombre || '❌ NO ENCONTRADA'}`);
  
  // 4. Verificar usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  const { data: relaciones } = await supabase
    .from('usuarios_empresas')
    .select('*, empresas(*)')
    .eq('usuario_id', user.id);
  
  const empresaTransporte = relaciones.find(r => r.empresas.tipo_empresa === 'transporte');
  
  console.log('\n👤 Usuario actual:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Empresa de transporte: ${empresaTransporte?.empresas.nombre}`);
  console.log(`   ID empresa: ${empresaTransporte?.empresa_id}`);
  
  // 5. Comparar IDs
  console.log('\n🔍 COMPARACIÓN DE IDS:');
  console.log(`   ID en el viaje:        ${ultimoViaje.id_transporte}`);
  console.log(`   ID del usuario:        ${empresaTransporte?.empresa_id}`);
  console.log(`   ¿Coinciden? ${ultimoViaje.id_transporte === empresaTransporte?.empresa_id ? '✅ SÍ' : '❌ NO'}`);
  
  if (ultimoViaje.id_transporte !== empresaTransporte?.empresa_id) {
    console.log('\n⚠️ PROBLEMA DETECTADO:');
    console.log('El ID de empresa asignado al viaje NO coincide con el ID de empresa del usuario.');
    console.log('\n💡 SOLUCIÓN:');
    console.log('Necesitas corregir el viaje para que apunte al ID correcto.');
    console.log('\nEjecuta este código para corregirlo:');
    console.log(`
await supabase
  .from('viajes_despacho')
  .update({ id_transporte: '${empresaTransporte?.empresa_id}' })
  .eq('id', '${ultimoViaje.id}');
    `);
  } else {
    console.log('\n✅ Los IDs coinciden correctamente.');
  }
})();

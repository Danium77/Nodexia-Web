// Script para verificar choferes existentes
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarChoferes() {
  console.log('🔍 Verificando choferes existentes...\n');

  // Primero listar todos los transportes
  const { data: transportes } = await supabase
    .from('transportes')
    .select('id, nombre, empresa_id');

  console.log('🚚 Transportes encontrados:');
  transportes?.forEach((t, idx) => {
    console.log(`${idx + 1}. ${t.nombre} (ID: ${t.id})`);
  });

  // Buscar el transporte que contiene "Logistica Express" o similar
  const transporte = transportes?.find(t => 
    t.nombre.toLowerCase().includes('logistica') || 
    t.nombre.toLowerCase().includes('express')
  );

  if (!transporte) {
    console.log('\n❌ No se encontró transporte Logística Express');
    return;
  }

  console.log('✅ Transporte encontrado:', transporte.nombre);
  console.log('   ID:', transporte.id);
  console.log('   Empresa ID:', transporte.empresa_id);

  // Buscar choferes de esa empresa
  const { data: choferes } = await supabase
    .from('choferes')
    .select('*')
    .eq('empresa_id', transporte.empresa_id);

  console.log(`\n👤 Choferes de ${transporte.nombre}:`);
  console.log('━'.repeat(50));

  if (!choferes || choferes.length === 0) {
    console.log('❌ No hay choferes registrados');
    return;
  }

  choferes.forEach((chofer, idx) => {
    console.log(`\n${idx + 1}. ${chofer.nombre_completo || `${chofer.nombre} ${chofer.apellido}`}`);
    console.log(`   ID: ${chofer.id}`);
    console.log(`   DNI: ${chofer.dni || 'N/A'}`);
    console.log(`   Teléfono: ${chofer.telefono || 'N/A'}`);
    console.log(`   Email: ${chofer.email || 'N/A'}`);
    console.log(`   Licencia: ${chofer.licencia_conducir || 'N/A'}`);
  });

  // Verificar si algún chofer tiene usuario asociado
  console.log('\n🔐 Verificando usuarios asociados...');
  
  for (const chofer of choferes) {
    const { data: usuario } = await supabase
      .from('usuarios_empresa')
      .select('user_id, rol_interno')
      .eq('empresa_id', transporte.empresa_id)
      .eq('rol_interno', 'chofer')
      .single();

    if (usuario) {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const userAuth = users.find(u => u.id === usuario.user_id);
      
      if (userAuth) {
        console.log(`\n✅ Usuario encontrado para chofer:`);
        console.log(`   Email: ${userAuth.email}`);
        console.log(`   User ID: ${userAuth.id}`);
        console.log(`   Chofer asociado: ${chofer.nombre_completo || `${chofer.nombre} ${chofer.apellido}`}`);
      }
    }
  }

  // Buscar despachos con este chofer
  if (choferes.length > 0) {
    console.log('\n📦 Despachos asignados a estos choferes:');
    
    for (const chofer of choferes) {
      const { data: despachos } = await supabase
        .from('despachos')
        .select('pedido_id, estado, scheduled_local_date')
        .eq('chofer_id', chofer.id)
        .order('scheduled_local_date', { ascending: false })
        .limit(5);

      if (despachos && despachos.length > 0) {
        console.log(`\n   Chofer: ${chofer.nombre_completo || `${chofer.nombre} ${chofer.apellido}`}`);
        despachos.forEach(d => {
          console.log(`   - ${d.pedido_id} (${d.estado}) - ${d.scheduled_local_date}`);
        });
      }
    }
  }
}

verificarChoferes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

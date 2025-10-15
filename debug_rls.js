// Debug RLS y permisos de usuario
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Cliente con anon key (como en la web)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cliente con service key (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugRLS() {
  console.log('🔍 DEBUGGING RLS y PERMISOS...');
  
  try {
    // 1. Ver despachos con service key
    console.log('\n🔑 CON SERVICE KEY (admin):');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('despachos')
      .select('pedido_id, estado, transport_id, created_by')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (adminError) {
      console.error('❌ Error admin:', adminError);
    } else {
      console.log('✅ Despachos visibles para admin:', adminData?.length);
      adminData?.forEach(d => {
        console.log(`   - ${d.pedido_id}: ${d.estado} | Transport: ${d.transport_id || 'null'} | Owner: ${d.created_by}`);
      });
    }
    
    // 2. Ver despachos con anon key (como web)
    console.log('\n🔓 CON ANON KEY (como web):');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('despachos')
      .select('pedido_id, estado, transport_id, created_by')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (anonError) {
      console.error('❌ Error anon:', anonError);
      console.log('💡 Esto significa que RLS está bloqueando el acceso');
    } else {
      console.log('✅ Despachos visibles para anon:', anonData?.length);
      anonData?.forEach(d => {
        console.log(`   - ${d.pedido_id}: ${d.estado} | Transport: ${d.transport_id || 'null'}`);
      });
    }
    
    // 3. Comparar resultados
    if (adminData && anonData) {
      const adminIds = adminData.map(d => d.pedido_id).sort();
      const anonIds = anonData.map(d => d.pedido_id).sort();
      
      console.log('\n📊 COMPARACIÓN:');
      console.log('Admin ve:', adminIds);
      console.log('Anon ve:', anonIds);
      
      if (JSON.stringify(adminIds) === JSON.stringify(anonIds)) {
        console.log('✅ Ambos ven los mismos despachos - RLS OK');
      } else {
        console.log('❌ PROBLEMA: RLS está filtrando despachos para usuarios anónimos');
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugRLS();
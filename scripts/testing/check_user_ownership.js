// Verificar qué usuario está actualmente logueado
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLoggedUser() {
  console.log('👤 VERIFICANDO USUARIOS...');
  
  try {
    // Ver todos los usuarios
    const { data: users } = await supabase.auth.admin.listUsers();
    
    console.log('\n📋 USUARIOS EN EL SISTEMA:');
    users.users.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`🆔 ${user.id}`);
      console.log(`📅 Creado: ${new Date(user.created_at).toLocaleString()}`);
      console.log('---');
    });
    
    // Ver quién es owner de los despachos
    const { data: despachos } = await supabase
      .from('despachos')
      .select('pedido_id, created_by')
      .limit(10);
    
    console.log('\n📦 OWNERS DE DESPACHOS:');
    const owners = [...new Set(despachos.map(d => d.created_by))];
    
    for (const ownerId of owners) {
      const user = users.users.find(u => u.id === ownerId);
      console.log(`👤 ${ownerId}`);
      console.log(`📧 ${user?.email || 'Usuario no encontrado'}`);
      
      const userDispatches = despachos.filter(d => d.created_by === ownerId);
      console.log(`📦 Despachos: ${userDispatches.map(d => d.pedido_id).join(', ')}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkLoggedUser();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log('🔍 Verificando usuarios en el sistema...\n');
  
  try {
    // Verificar tabla profiles o usuarios
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (profiles && profiles.length > 0) {
      console.log('👥 PERFILES ENCONTRADOS:');
      profiles.forEach(p => {
        console.log(`   Email: ${p.email || 'N/A'}`);
        console.log(`   Rol: ${p.role || p.rol || 'N/A'}`);
        console.log(`   Nombre: ${p.nombre_completo || p.full_name || 'N/A'}`);
        console.log('   ---');
      });
    } else if (profileError) {
      console.log('❌ Error accediendo a profiles:', profileError.message);
    }
    
    // Verificar auth.users (requiere service key)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authUsers && authUsers.users && authUsers.users.length > 0) {
      console.log('\n🔐 USUARIOS DE AUTENTICACIÓN:');
      authUsers.users.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`);
        console.log(`   Creado: ${user.created_at}`);
        console.log(`   Metadata: ${JSON.stringify(user.user_metadata, null, 2)}`);
        console.log('   ---');
      });
    } else if (authError) {
      console.log('❌ Error accediendo a auth users:', authError.message);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

checkUsers();
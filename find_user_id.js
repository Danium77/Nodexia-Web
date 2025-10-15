// Buscar un usuario existente para usar como created_by
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUser() {
  try {
    // Buscar usuarios
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('👥 Usuarios encontrados:', users.users.length);
    if (users.users.length > 0) {
      const user = users.users[0];
      console.log('🎯 Usar este UUID:', user.id);
      console.log('📧 Email:', user.email);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findUser();
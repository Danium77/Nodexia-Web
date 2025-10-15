// Verificar y resetear contraseña del coordinador
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetCoordinatorPassword() {
  console.log('🔑 RESETEANDO CONTRASEÑA DEL COORDINADOR...');
  
  try {
    // Buscar el usuario coordinador
    const { data: users } = await supabase.auth.admin.listUsers();
    const coordinador = users.users.find(u => u.email === 'coordinador@nodexia.com');
    
    if (!coordinador) {
      console.log('❌ Usuario coordinador no encontrado');
      return;
    }
    
    console.log('👤 Usuario encontrado:', coordinador.email);
    console.log('🆔 ID:', coordinador.id);
    
    // Resetear contraseña
    const { data, error } = await supabase.auth.admin.updateUserById(
      coordinador.id,
      { 
        password: 'Nodexia2025!',
        email_confirm: true 
      }
    );
    
    if (error) {
      console.error('❌ Error reseteando contraseña:', error);
    } else {
      console.log('✅ Contraseña reseteada exitosamente!');
    }
    
    console.log('\n🎯 CREDENCIALES ACTUALIZADAS:');
    console.log('📧 Email: coordinador@nodexia.com');
    console.log('🔑 Password: Nodexia2025!');
    console.log('\n🚀 Ahora sí puedes hacer login en el browser!');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

resetCoordinatorPassword();
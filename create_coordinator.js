// Crear usuario coordinador para testing
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCoordinatorUser() {
  console.log('👤 CREANDO USUARIO COORDINADOR...');
  
  try {
    // 1. Crear usuario en Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'coordinador@nodexia.com',
      password: 'Nodexia2025!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Coordinador Principal',
        role: 'coordinador'
      }
    });

    if (authError) {
      if (authError.message.includes('User already registered')) {
        console.log('⚠️ Usuario ya existe en Auth');
        // Buscar el usuario existente
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === 'coordinador@nodexia.com');
        if (existingUser) {
          console.log('✅ Usuario encontrado:', existingUser.id);
          return existingUser.id;
        }
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Usuario creado en Auth:', authUser.user.id);
    }

    const userId = authUser?.user?.id || (await supabase.auth.admin.listUsers())
      .data.users.find(u => u.email === 'coordinador@nodexia.com')?.id;

    // 2. Crear perfil de usuario
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: 'coordinador@nodexia.com',
        full_name: 'Coordinador Principal',
        role: 'coordinador',
        empresa_id: null,
        active: true
      }, {
        onConflict: 'id'
      })
      .select();

    if (profileError) {
      console.error('❌ Error creando perfil:', profileError);
    } else {
      console.log('✅ Perfil creado/actualizado');
    }

    console.log('\n🎯 LISTO! Usar estas credenciales:');
    console.log('📧 Email: coordinador@nodexia.com');
    console.log('🔑 Password: Nodexia2025!');
    console.log('🎭 Rol: coordinador');
    
    return userId;

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createCoordinatorUser().then(() => {
  console.log('\n🚀 Ahora sí puedes hacer login!');
  process.exit(0);
});
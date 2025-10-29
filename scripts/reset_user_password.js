const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function resetPassword(email) {
  try {
    console.log(`🔄 Reseteando password para: ${email}`);

    // Generar nuevo password temporal
    const newPassword = `Temp${Math.random().toString(36).slice(-8)}!${Date.now().toString().slice(-4)}`;

    // Buscar el usuario por email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listando usuarios:', listError);
      return;
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', user.id);

    // Actualizar password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.error('❌ Error actualizando password:', error);
      return;
    }

    // Generar nuevo link de invitación
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
      }
    });

    console.log('\n✅ Password reseteado exitosamente!\n');
    console.log('📧 Email:', email);
    console.log('🔑 Nuevo Password:', newPassword);
    console.log('🔗 Magic Link:', linkData?.properties?.action_link || 'No disponible');
    console.log('\n📋 Credenciales completas:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log('\n⚠️ Guarda estas credenciales ahora!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Ejecutar
const email = process.argv[2];

if (!email) {
  console.log('❌ Uso: node scripts/reset_user_password.js EMAIL');
  console.log('Ejemplo: node scripts/reset_user_password.js gonzalo@logisticaexpres.com');
  process.exit(1);
}

resetPassword(email);

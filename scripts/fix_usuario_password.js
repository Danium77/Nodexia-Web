/**
 * Fix: Asignar password y confirmar email
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUsuario() {
  const email = 'logistica@aceiterasanmiguel.com';
  const password = 'Aceitera2024!';

  console.log('\n🔧 FIXING USER...\n');

  // 1. Buscar usuario
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error('❌ Usuario no encontrado');
    return;
  }

  console.log(`✅ Usuario encontrado: ${user.id}`);
  console.log(`   Email confirmado: ${user.email_confirmed_at ? 'SÍ' : 'NO'}\n`);

  // 2. Actualizar usuario con password Y confirmar email
  console.log('🔄 Actualizando usuario...');
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { 
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: 'Leandro Caceres',
        empresa: 'Aceitera San Miguel S.A'
      }
    }
  );

  if (updateError) {
    console.error('❌ Error:', updateError.message);
    return;
  }

  console.log('✅ Usuario actualizado\n');

  // 3. Verificar nuevamente
  const { data: { users: usersAfter } } = await supabase.auth.admin.listUsers();
  const userAfter = usersAfter.find(u => u.email === email);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ESTADO FINAL DEL USUARIO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Email:            ${userAfter.email}`);
  console.log(`Email confirmado: ${userAfter.email_confirmed_at ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Fecha confirm:    ${userAfter.email_confirmed_at || 'N/A'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Probar login
  console.log('🔐 Probando autenticación...\n');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (authError) {
    console.error('❌ ERROR AL AUTENTICAR:');
    console.error(`   ${authError.message}`);
    console.error(`   Status: ${authError.status}`);
    
    // Mostrar info útil para debug
    if (authError.message.includes('Invalid')) {
      console.log('\n💡 El error "Invalid login credentials" puede deberse a:');
      console.log('   1. Email no confirmado');
      console.log('   2. Password no guardado correctamente');
      console.log('   3. Usuario bloqueado o inactivo\n');
    }
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡AUTENTICACIÓN EXITOSA!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Ahora puedes iniciar sesión en:');
    console.log('   http://localhost:3000/login\n');
  }
}

fixUsuario().catch(console.error);

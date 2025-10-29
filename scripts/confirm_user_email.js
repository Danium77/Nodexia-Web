/**
 * Script para confirmar el email de un usuario en Supabase Auth
 * Uso: node scripts/confirm_user_email.js EMAIL
 * 
 * Este script es necesario cuando se crean usuarios sin el flujo de email
 * ya que Supabase los crea con email_confirmed_at = null
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Necesitas NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmUserEmail(email) {
  try {
    console.log(`\n🔍 Buscando usuario: ${email}...`);
    
    // Buscar usuario por email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error al buscar usuario:', listError.message);
      return;
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.id}`);
    console.log(`📧 Email confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`);

    if (user.email_confirmed_at) {
      console.log('⚠️  El email ya está confirmado');
      console.log(`📅 Confirmado el: ${user.email_confirmed_at}`);
      return;
    }

    // Confirmar email del usuario
    console.log('\n🔄 Confirmando email...');
    
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        email_confirm: true,
        // También podemos actualizar user_metadata si es necesario
        user_metadata: {
          ...user.user_metadata,
          email_verified: true
        }
      }
    );

    if (error) {
      console.error('❌ Error al confirmar email:', error.message);
      return;
    }

    console.log('\n✅ Email confirmado exitosamente!');
    console.log('\n📊 RESULTADO:');
    console.log(`✅ Usuario: ${data.user.email}`);
    console.log(`✅ ID: ${data.user.id}`);
    console.log(`✅ Email confirmado: Sí`);
    console.log(`✅ Fecha confirmación: ${data.user.email_confirmed_at}`);
    console.log('\n🎉 El usuario ya puede iniciar sesión normalmente!');

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

// Obtener email de argumentos
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Debes proporcionar un email');
  console.error('\nUso: node scripts/confirm_user_email.js EMAIL');
  console.error('Ejemplo: node scripts/confirm_user_email.js gonzalo@logisticaexpres.com');
  process.exit(1);
}

// Ejecutar
confirmUserEmail(email);

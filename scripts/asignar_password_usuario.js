/**
 * Script para asignar contraseña a usuario recién creado
 * Usar cuando falla el envío de email de invitación
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function asignarPasswordUsuario() {
  try {
    // Email del usuario recién creado
    const email = 'logistica@aceiterasanmiguel.com';
    const password = 'Aceitera2024!';

    console.log('🔐 Asignando contraseña a usuario...\n');
    console.log(`Email: ${email}`);

    // Buscar el usuario en auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listando usuarios:', listError);
      process.exit(1);
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ No se encontró el usuario ${email}`);
      console.log('\n💡 Usuarios disponibles:');
      users.slice(0, 5).forEach(u => console.log(`   - ${u.email}`));
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.id}\n`);

    // Actualizar la contraseña
    console.log('🔄 Actualizando contraseña...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: password,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError);
      process.exit(1);
    }

    console.log('✅ Contraseña asignada exitosamente\n');

    // Verificar datos del usuario
    const { data: userData } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre_completo,
        rol,
        usuarios_empresa (
          empresa_id,
          rol_interno,
          empresas (
            nombre,
            tipo_empresa
          )
        )
      `)
      .eq('id', user.id)
      .single();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ USUARIO ACTIVADO - CREDENCIALES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    if (userData) {
      console.log(`Nombre:   ${userData.nombre_completo || 'N/A'}`);
      console.log(`Rol:      ${userData.rol || 'N/A'}`);
      if (userData.usuarios_empresa && userData.usuarios_empresa[0]) {
        console.log(`Empresa:  ${userData.usuarios_empresa[0].empresas?.nombre || 'N/A'}`);
        console.log(`Tipo:     ${userData.usuarios_empresa[0].empresas?.tipo_empresa || 'N/A'}`);
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. Ir a http://localhost:3000/login');
    console.log('2. Iniciar sesión con las credenciales anteriores');
    console.log('3. Ir a /configuracion/ubicaciones');
    console.log('4. Vincular 2-3 ubicaciones a la empresa');
    console.log('5. Probar crear despacho\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

asignarPasswordUsuario();

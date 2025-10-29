/**
 * Verificar estado del usuario en auth.users
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

async function verificarUsuario() {
  try {
    const email = 'logistica@aceiterasanmiguel.com';
    
    console.log(`\n🔍 Buscando usuario: ${email}\n`);

    // Listar todos los usuarios
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listando usuarios:', listError);
      process.exit(1);
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ Usuario NO encontrado en auth.users`);
      console.log('\n📋 Usuarios existentes:');
      users.forEach(u => {
        console.log(`   - ${u.email} (${u.id})`);
      });
      process.exit(1);
    }

    console.log('✅ Usuario encontrado en auth.users\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DATOS DEL USUARIO EN AUTH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:                ${user.id}`);
    console.log(`Email:             ${user.email}`);
    console.log(`Email confirmado:  ${user.email_confirmed_at ? 'SÍ' : 'NO'}`);
    console.log(`Fecha confirmación: ${user.email_confirmed_at || 'N/A'}`);
    console.log(`Última sesión:     ${user.last_sign_in_at || 'Nunca'}`);
    console.log(`Creado:            ${user.created_at}`);
    console.log(`Metadata:          ${JSON.stringify(user.user_metadata, null, 2)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar en tabla usuarios
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre_completo,
        rol,
        activo,
        created_at,
        usuarios_empresa (
          empresa_id,
          rol_interno,
          activo,
          empresas (
            id,
            nombre,
            tipo_empresa
          )
        )
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error consultando tabla usuarios:', userError);
    } else if (!userData) {
      console.log('⚠️ Usuario NO encontrado en tabla usuarios');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('DATOS DEL USUARIO EN TABLA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Nombre:   ${userData.nombre_completo}`);
      console.log(`Rol:      ${userData.rol}`);
      console.log(`Activo:   ${userData.activo ? 'SÍ' : 'NO'}`);
      if (userData.usuarios_empresa && userData.usuarios_empresa[0]) {
        const ue = userData.usuarios_empresa[0];
        console.log(`Empresa:  ${ue.empresas?.nombre || 'N/A'}`);
        console.log(`Tipo:     ${ue.empresas?.tipo_empresa || 'N/A'}`);
        console.log(`Rol interno: ${ue.rol_interno || 'N/A'}`);
        console.log(`Vinc. activa: ${ue.activo ? 'SÍ' : 'NO'}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Intentar hacer sign in para verificar credenciales
    console.log('🔐 Probando autenticación con password "Aceitera2024!"...\n');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'Aceitera2024!'
    });

    if (signInError) {
      console.error('❌ ERROR DE AUTENTICACIÓN:');
      console.error(`   Código: ${signInError.status}`);
      console.error(`   Mensaje: ${signInError.message}`);
      console.error(`   Detalles:`, signInError);
      
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('   1. Email no confirmado (email_confirmed_at = null)');
      console.log('   2. Password no asignado correctamente');
      console.log('   3. Usuario inactivo en auth');
      console.log('   4. Problema de configuración de Supabase\n');
    } else {
      console.log('✅ AUTENTICACIÓN EXITOSA');
      console.log(`   Usuario: ${signInData.user.email}`);
      console.log(`   Session: ${signInData.session ? 'Creada' : 'No creada'}\n`);
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

verificarUsuario();

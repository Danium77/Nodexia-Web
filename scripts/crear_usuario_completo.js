/**
 * Crear usuario completo en auth.users Y en tabla usuarios
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

async function crearUsuarioCompleto() {
  const email = 'logistica@aceiterasanmiguel.com';
  const password = 'Aceitera2024!';
  const nombreCompleto = 'Leandro Caceres';
  const empresaId = '3cc1979e-1672-48b8-a5e5-2675f5cac527'; // Aceitera San Miguel S.A

  console.log('\n🏗️  CREANDO USUARIO COMPLETO...\n');

  // 1. Verificar si ya existe en auth.users
  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
  let authUser = existingUsers.find(u => u.email === email);
  
  if (authUser) {
    console.log(`✅ Usuario ya existe en auth.users: ${authUser.id}`);
  } else {
    // Crear en auth.users
    console.log('🔨 Creando usuario en auth.users...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: nombreCompleto,
        empresa: 'Aceitera San Miguel S.A'
      }
    });

    if (createError) {
      console.error('❌ Error creando usuario:', createError.message);
      return;
    }

    authUser = newUser.user;
    console.log(`✅ Usuario creado en auth.users: ${authUser.id}\n`);
  }

  // 2. Verificar/crear en tabla usuarios
  const { data: existingUsuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingUsuario) {
    console.log('✅ Usuario ya existe en tabla usuarios');
    
    // Actualizar datos
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        email: email,
        nombre_completo: nombreCompleto
      })
      .eq('id', authUser.id);

    if (updateError) {
      console.error('⚠️  Error actualizando usuarios:', updateError.message);
    } else {
      console.log('✅ Datos actualizados en tabla usuarios');
    }
  } else {
    console.log('🔨 Creando registro en tabla usuarios...');
    const { error: insertError } = await supabase
      .from('usuarios')
      .insert({
        id: authUser.id,
        email: email,
        nombre_completo: nombreCompleto
      });

    if (insertError) {
      console.error('❌ Error insertando en usuarios:', insertError.message);
      return;
    }
    console.log('✅ Registro creado en tabla usuarios');
  }

  // 3. Verificar/crear vínculo empresa
  const { data: existingVinculo } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .eq('user_id', authUser.id)
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (existingVinculo) {
    console.log('✅ Vínculo empresa ya existe');
    
    // Asegurar que está activo
    await supabase
      .from('usuarios_empresa')
      .update({ activo: true })
      .eq('user_id', authUser.id)
      .eq('empresa_id', empresaId);
  } else {
    console.log('🔨 Creando vínculo con empresa...');
    const { error: vinculoError } = await supabase
      .from('usuarios_empresa')
      .insert({
        user_id: authUser.id,
        empresa_id: empresaId,
        rol_interno: 'coordinador',
        nombre_completo: nombreCompleto,
        email_interno: email,
        activo: true
      });

    if (vinculoError) {
      console.error('⚠️  Error creando vínculo:', vinculoError.message);
    } else {
      console.log('✅ Vínculo creado con empresa');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 USUARIO COMPLETAMENTE CONFIGURADO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Nombre:   ${nombreCompleto}`);
  console.log(`Empresa:  Aceitera San Miguel S.A`);
  console.log(`Rol:      coordinador`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Probar autenticación
  console.log('🔐 Probando autenticación...\n');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (authError) {
    console.error('❌ ERROR AL AUTENTICAR:');
    console.error(`   ${authError.message}`);
  } else {
    console.log('✅ ¡AUTENTICACIÓN EXITOSA!\n');
    console.log('🎯 SIGUIENTE PASO:');
    console.log('   1. Ir a http://localhost:3000/login');
    console.log('   2. Iniciar sesión con las credenciales anteriores');
    console.log('   3. Deberías ser redirigido al dashboard de coordinador\n');
  }
}

crearUsuarioCompleto().catch(console.error);

/**
 * Script para resetear contraseña de un usuario o crear admin@nodexia.com
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

async function setupAdminNodexia() {
  try {
    console.log('🔐 Configurando admin@nodexia.com...\n');

    const email = 'admin@nodexia.com';
    const password = 'Nodexia2025!';

    // 1. Verificar si existe en auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      console.log('✅ Usuario ya existe en auth.users');
      console.log(`   ID: ${existingUser.id}\n`);
      
      // Actualizar contraseña
      console.log('🔄 Actualizando contraseña...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );

      if (updateError) {
        console.error('❌ Error actualizando contraseña:', updateError);
        process.exit(1);
      }
      
      console.log('✅ Contraseña actualizada\n');
      
    } else {
      // Crear nuevo usuario
      console.log('📝 Creando nuevo usuario admin@nodexia.com...');
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nombre: 'Admin',
          apellido: 'Nodexia',
          rol: 'super_admin',
          email_verified: true
        }
      });

      if (authError) {
        console.error('❌ Error creando usuario:', authError);
        process.exit(1);
      }

      console.log(`✅ Usuario creado en auth: ${authData.user.id}\n`);

      // Crear perfil en tabla usuarios
      console.log('📝 Creando perfil en tabla usuarios...');
      const { error: perfilError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: email,
          nombre_completo: 'Admin Nodexia',
          rol: 'super_admin',
          password: 'set_by_auth'
        });

      if (perfilError) {
        console.error('❌ Error creando perfil:', perfilError);
        // No eliminar el usuario de auth, solo notificar
      } else {
        console.log('✅ Perfil creado\n');
      }

      // Buscar o crear empresa Nodexia
      console.log('🏢 Buscando empresa Nodexia...');
      let { data: empresaNodexia } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('nombre', 'Nodexia')
        .single();

      if (!empresaNodexia) {
        console.log('📝 Creando empresa Nodexia...');
        const { data: nuevaEmpresa, error: empresaError } = await supabase
          .from('empresas')
          .insert({
            nombre: 'Nodexia',
            cuit: '30-00000000-0',
            email: 'admin@nodexia.com',
            telefono: '+54 11 0000-0000',
            direccion: 'Plataforma',
            tipo_empresa: 'sistema',
            provincia: 'Buenos Aires',
            localidad: 'Buenos Aires',
            activo: true,
            activa: true
          })
          .select()
          .single();

        if (empresaError) {
          console.error('❌ Error creando empresa:', empresaError);
        } else {
          empresaNodexia = nuevaEmpresa;
          console.log('✅ Empresa Nodexia creada\n');
        }
      } else {
        console.log(`✅ Empresa Nodexia encontrada: ${empresaNodexia.id}\n`);
      }

      // Vincular usuario con empresa
      if (empresaNodexia) {
        console.log('🔗 Vinculando usuario con empresa Nodexia...');
        const { error: vinculoError } = await supabase
          .from('usuarios_empresa')
          .insert({
            user_id: authData.user.id,
            empresa_id: empresaNodexia.id,
            rol_interno: 'super_admin',
            nombre_completo: 'Admin Nodexia',
            email_interno: email,
            activo: true,
            fecha_vinculacion: new Date().toISOString()
          });

        if (vinculoError) {
          console.error('❌ Error vinculando empresa:', vinculoError);
        } else {
          console.log('✅ Usuario vinculado a empresa\n');
        }
      }
    }

    // Mostrar resultado
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ADMIN NODEXIA CONFIGURADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Rol:      super_admin`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Ahora puedes:');
    console.log('1. Ir a http://localhost:3000/login');
    console.log('2. Iniciar sesión con las credenciales anteriores');
    console.log('3. Acceder a /admin/usuarios para crear otros usuarios\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

setupAdminNodexia();

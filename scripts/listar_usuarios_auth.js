/**
 * Script para listar todos los usuarios en auth.users y tabla usuarios
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

async function listarUsuarios() {
  try {
    console.log('🔍 Listando usuarios en la base de datos...\n');

    // 1. Listar usuarios de auth.users
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USUARIOS EN AUTH.USERS (Supabase Auth)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
    } else {
      console.log(`Total usuarios en auth: ${authUsers.users.length}\n`);
      
      authUsers.users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Creado: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   Último login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Nunca'}`);
        console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`);
        console.log(`   Metadata: ${JSON.stringify(user.user_metadata || {})}`);
        console.log('');
      });
    }

    // 2. Listar usuarios de tabla usuarios
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USUARIOS EN TABLA USUARIOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: tableUsers, error: tableError } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (tableError) {
      console.error('❌ Error obteniendo usuarios de tabla:', tableError);
    } else {
      console.log(`Total usuarios en tabla: ${tableUsers.length}\n`);
      
      tableUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.nombre_completo || 'N/A'}`);
        console.log(`   Rol: ${user.rol || 'N/A'}`);
        console.log(`   Creado: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 3. Listar vínculos usuarios-empresa
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 VÍNCULOS USUARIOS-EMPRESA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: vinculos, error: vinculosError } = await supabase
      .from('usuarios_empresa')
      .select(`
        id,
        user_id,
        empresa_id,
        rol_interno,
        nombre_completo,
        email_interno,
        activo,
        empresas (
          nombre,
          tipo_empresa
        )
      `)
      .order('fecha_vinculacion', { ascending: false });

    if (vinculosError) {
      console.error('❌ Error obteniendo vínculos:', vinculosError);
    } else {
      console.log(`Total vínculos: ${vinculos.length}\n`);
      
      vinculos.forEach((vinculo, index) => {
        console.log(`${index + 1}. ${vinculo.email_interno || vinculo.nombre_completo}`);
        console.log(`   User ID: ${vinculo.user_id}`);
        console.log(`   Empresa: ${vinculo.empresas?.nombre || 'N/A'} (${vinculo.empresas?.tipo_empresa || 'N/A'})`);
        console.log(`   Rol: ${vinculo.rol_interno}`);
        console.log(`   Activo: ${vinculo.activo ? 'Sí' : 'No'}`);
        console.log('');
      });
    }

    // 4. Buscar usuarios con rol super_admin o administrador
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 USUARIOS ADMINISTRADORES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: admins } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo, rol')
      .or('rol.eq.super_admin,rol.eq.administrador,rol.eq.admin');

    if (admins && admins.length > 0) {
      console.log(`Encontrados ${admins.length} administradores:\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`);
        console.log(`   Rol: ${admin.rol}`);
        console.log(`   Nombre: ${admin.nombre_completo || 'N/A'}`);
        console.log('');
      });
      
      console.log('💡 Para resetear contraseña de un admin, usa:');
      console.log('   node scripts/reset_password.js <email>\n');
    } else {
      console.log('⚠️  No se encontraron usuarios administradores\n');
      console.log('💡 Puede que necesites crear un usuario admin manualmente.\n');
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

listarUsuarios();

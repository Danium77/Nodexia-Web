// Script para cambiar el rol de un usuario
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cambiarRolUsuario() {
  const email = 'porteria@aceiterasanmiguel.com';
  const nuevoRol = 'control_acceso';

  console.log(`🔍 Buscando usuario: ${email}`);

  // Buscar el usuario por email
  const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
  
  if (searchError) {
    console.error('❌ Error buscando usuarios:', searchError);
    return;
  }

  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error(`❌ Usuario no encontrado: ${email}`);
    return;
  }

  console.log(`✅ Usuario encontrado: ${user.id}`);

  // Buscar la empresa Aceitera San Miguel
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('nombre', 'Aceitera San Miguel S.A')
    .single();

  if (empresaError || !empresa) {
    console.error('❌ Error buscando empresa:', empresaError);
    return;
  }

  console.log(`✅ Empresa encontrada: ${empresa.nombre} (${empresa.id})`);

  // Buscar si existe relación usuario-empresa
  const { data: relacionActual, error: buscarError } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (relacionActual) {
    console.log(`📋 Rol actual: ${relacionActual.rol_interno}`);
    console.log(`🔄 Actualizando a: ${nuevoRol}`);

    const { error: updateError } = await supabase
      .from('usuarios_empresa')
      .update({ rol_interno: nuevoRol })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Error actualizando rol:', updateError);
      return;
    }
  } else {
    console.log(`📝 Creando nueva relación usuario-empresa con rol: ${nuevoRol}`);

    const { error: insertError } = await supabase
      .from('usuarios_empresa')
      .insert({
        user_id: user.id,
        empresa_id: empresa.id,
        rol_interno: nuevoRol,
        activo: true
      });

    if (insertError) {
      console.error('❌ Error creando relación:', insertError);
      return;
    }
  }

  console.log(`✅ Rol actualizado exitosamente a: ${nuevoRol}`);
  console.log(`\n📝 Credenciales del usuario:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: Temporal2024!`);
  console.log(`   Rol:      ${nuevoRol}`);
  console.log(`\n🔐 El usuario debe cerrar sesión y volver a iniciar para ver los cambios`);
}

cambiarRolUsuario()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

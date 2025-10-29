/**
 * Script para crear un usuario coordinador completo con empresa asignada
 * Crea: usuario → asigna rol → vincula empresa
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

async function crearCoordinadorCompleto() {
  try {
    console.log('🚀 Iniciando creación de usuario coordinador completo...\n');

    // Datos del nuevo usuario
    const email = 'coordinador.test@planta.com';
    const password = 'Planta2024!';
    const nombre = 'Carlos';
    const apellido = 'Coordinador Test';
    const rol = 'coordinador';

    // 1. Buscar una empresa tipo planta (cualquiera disponible)
    console.log('1️⃣  Buscando empresa tipo planta...');
    const { data: empresas, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nombre, tipo_empresa')
      .eq('tipo_empresa', 'planta')
      .eq('activo', true)
      .limit(1);

    if (empresaError || !empresas || empresas.length === 0) {
      console.error('❌ No se encontró ninguna empresa tipo planta:', empresaError);
      console.log('\n💡 Buscando cualquier empresa activa...');
      
      // Fallback: buscar cualquier empresa activa
      const { data: cualquierEmpresa, error: fallbackError } = await supabase
        .from('empresas')
        .select('id, nombre, tipo_empresa')
        .eq('activo', true)
        .limit(1);
      
      if (fallbackError || !cualquierEmpresa || cualquierEmpresa.length === 0) {
        console.error('❌ No hay empresas activas en el sistema');
        process.exit(1);
      }
      
      var empresa = cualquierEmpresa[0];
    } else {
      var empresa = empresas[0];
    }
    
    console.log(`✅ Empresa encontrada: ${empresa.nombre} (Tipo: ${empresa.tipo_empresa || 'N/A'}, ID: ${empresa.id})\n`);

    // 2. Crear usuario en auth.users
    console.log('2️⃣  Creando usuario en auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre,
        apellido: apellido,
        rol: rol
      }
    });

    if (authError) {
      console.error('❌ Error creando usuario:', authError);
      process.exit(1);
    }
    console.log(`✅ Usuario creado en auth: ${authData.user.id}\n`);

    // 3. Crear perfil en tabla usuarios
    console.log('3️⃣  Creando perfil en tabla usuarios...');
    const { error: perfilError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email: email,
        nombre_completo: `${nombre} ${apellido}`,
        rol: rol,
        password: 'set_by_auth' // placeholder, real auth is in auth.users
      });

    if (perfilError) {
      console.error('❌ Error creando perfil:', perfilError);
      // Intentar eliminar el usuario de auth si falla el perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      process.exit(1);
    }
    console.log('✅ Perfil creado en tabla usuarios\n');

    // 4. Asignar empresa al usuario
    console.log('4️⃣  Asignando empresa al usuario...');
    const { error: vinculoError } = await supabase
      .from('usuarios_empresa')
      .insert({
        user_id: authData.user.id,
        empresa_id: empresa.id,
        rol_interno: rol,
        nombre_completo: `${nombre} ${apellido}`,
        email_interno: email,
        activo: true,
        fecha_vinculacion: new Date().toISOString()
      });

    if (vinculoError) {
      console.error('❌ Error asignando empresa:', vinculoError);
      // Cleanup
      await supabase.from('usuarios').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      process.exit(1);
    }
    console.log('✅ Empresa asignada al usuario\n');

    // 5. Mostrar resultado
    console.log('\n✅ ¡USUARIO CREADO EXITOSAMENTE!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CREDENCIALES DEL NUEVO USUARIO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Nombre:   ${nombre} ${apellido}`);
    console.log(`Rol:      ${rol}`);
    console.log(`Empresa:  ${empresa.nombre}`);
    console.log(`Tipo:     ${empresa.tipo_empresa || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. Cerrar sesión actual en la aplicación');
    console.log('2. Iniciar sesión con las credenciales anteriores');
    console.log('3. Ir a /configuracion/ubicaciones');
    console.log('4. Vincular 2-3 ubicaciones a la empresa');
    console.log('5. Probar crear despacho con ubicaciones vinculadas\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

crearCoordinadorCompleto();

/**
 * Script para verificar vinculación de Walter Zayas con Logística Express
 * Fecha: 24 de Noviembre 2025
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const WALTER_USER_ID = '50da5768-b203-4719-ad16-62e03e2b151a';

async function main() {
  console.log('🔍 VERIFICANDO VINCULACIÓN DE WALTER ZAYAS\n');

  try {
    // 1. Verificar usuario en auth.users
    console.log('1️⃣ Usuario en auth.users:');
    const { data: authUser } = await supabase.auth.admin.getUserById(WALTER_USER_ID);
    console.log(`   ✅ Email: ${authUser.user.email}`);
    console.log(`   ✅ Confirmado: ${authUser.user.email_confirmed_at ? 'Sí' : 'No'}`);
    console.log('');

    // 2. Verificar en usuarios_empresa
    console.log('2️⃣ Registro en usuarios_empresa:');
    const { data: userEmpresa, error: userError } = await supabase
      .from('usuarios_empresa')
      .select('*, empresas(*)')
      .eq('user_id', WALTER_USER_ID);

    if (userError) {
      console.log(`   ❌ Error: ${userError.message}`);
    } else if (!userEmpresa || userEmpresa.length === 0) {
      console.log('   ❌ NO encontrado en usuarios_empresa');
    } else {
      userEmpresa.forEach(ue => {
        console.log(`   ✅ Empresa: ${ue.empresas.nombre}`);
        console.log(`   ✅ Rol: ${ue.rol_interno}`);
        console.log(`   ✅ Activo: ${ue.activo}`);
      });
    }
    console.log('');

    // 3. Verificar si existe en tabla choferes
    console.log('3️⃣ Registro en tabla choferes:');
    const { data: chofer, error: choferError } = await supabase
      .from('choferes')
      .select('*')
      .or(`email.eq.${authUser.user.email},user_id.eq.${WALTER_USER_ID}`);

    if (choferError) {
      console.log(`   ❌ Error: ${choferError.message}`);
    } else if (!chofer || chofer.length === 0) {
      console.log('   ⚠️  NO encontrado en tabla choferes');
      console.log('   💡 Necesita crearse el registro de chofer');
    } else {
      console.log(`   ✅ ID: ${chofer[0].id}`);
      console.log(`   ✅ Nombre: ${chofer[0].nombre} ${chofer[0].apellido || ''}`);
      console.log(`   ✅ DNI: ${chofer[0].dni || 'N/A'}`);
      console.log(`   ✅ Teléfono: ${chofer[0].telefono || 'N/A'}`);
      console.log(`   ✅ Empresa ID: ${chofer[0].id_transporte || chofer[0].empresa_id || 'N/A'}`);
      console.log(`   ${chofer[0].user_id ? '✅' : '⚠️'} User ID vinculado: ${chofer[0].user_id || 'NO VINCULADO'}`);
    }
    console.log('');

    // 4. Verificar viajes asignados
    console.log('4️⃣ Viajes asignados:');
    if (chofer && chofer.length > 0) {
      const { data: viajes, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select('*, despachos(*)')
        .eq('chofer_id', chofer[0].id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (viajesError) {
        console.log(`   ❌ Error: ${viajesError.message}`);
      } else if (!viajes || viajes.length === 0) {
        console.log('   ℹ️  No hay viajes asignados actualmente');
      } else {
        console.log(`   ✅ ${viajes.length} viaje(s) encontrado(s):`);
        viajes.forEach((v, i) => {
          console.log(`   ${i + 1}. ${v.despachos?.id_pedido || v.despacho_id} - Estado: ${v.estado}`);
        });
      }
    }
    console.log('');

    // 5. Resumen
    console.log('═══════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════');
    
    const authOk = authUser && authUser.user;
    const empresaOk = userEmpresa && userEmpresa.length > 0;
    const choferOk = chofer && chofer.length > 0;
    const vinculadoOk = chofer && chofer[0]?.user_id === WALTER_USER_ID;

    console.log(`${authOk ? '✅' : '❌'} Usuario en auth.users`);
    console.log(`${empresaOk ? '✅' : '❌'} Vinculado a empresa (usuarios_empresa)`);
    console.log(`${choferOk ? '✅' : '⚠️'} Registro en tabla choferes`);
    console.log(`${vinculadoOk ? '✅' : '⚠️'} user_id vinculado en choferes`);
    console.log('');

    if (authOk && empresaOk && !choferOk) {
      console.log('💡 ACCIÓN REQUERIDA:');
      console.log('   Crear registro en tabla choferes para Walter');
      console.log('   Ejecutar: node scripts/crear-chofer-walter.js');
    } else if (choferOk && !vinculadoOk) {
      console.log('💡 ACCIÓN REQUERIDA:');
      console.log('   Vincular user_id con registro de chofer existente');
      console.log('   UPDATE choferes SET user_id = \'' + WALTER_USER_ID + '\' WHERE email = \'' + authUser.user.email + '\';');
    } else if (authOk && empresaOk && choferOk && vinculadoOk) {
      console.log('🎉 TODO CONFIGURADO CORRECTAMENTE');
      console.log('   Walter puede recibir viajes asignados');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

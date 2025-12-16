/**
 * Script para crear el registro de chofer para Walter Zayas
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
const EMPRESA_ID = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'; // Logística Express SRL

async function main() {
  console.log('🚀 CREANDO REGISTRO DE CHOFER PARA WALTER ZAYAS\n');

  try {
    // 1. Verificar que no exista ya
    console.log('1️⃣ Verificando si ya existe...');
    const { data: existing } = await supabase
      .from('choferes')
      .select('*')
      .eq('user_id', WALTER_USER_ID);

    if (existing && existing.length > 0) {
      console.log('   ⚠️  Ya existe un registro de chofer para este usuario');
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Nombre: ${existing[0].nombre}`);
      return;
    }
    console.log('   ✅ No existe, procediendo a crear...\n');

    // 2. Crear registro de chofer
    console.log('2️⃣ Creando registro en tabla choferes...');
    const { data: newChofer, error: choferError } = await supabase
      .from('choferes')
      .insert({
        user_id: WALTER_USER_ID,
        nombre: 'Walter',
        apellido: 'Zayas',
        email: 'walter@logisticaexpres.com',
        telefono: '+54 9 11 2345-6789',
        dni: '30123456',
        id_transporte: EMPRESA_ID
      })
      .select();

    if (choferError) {
      console.error('   ❌ Error al crear chofer:', choferError.message);
      console.error('   Detalles:', choferError);
      
      // Intentar con campo alternativo
      console.log('\n   Intentando con campo empresa_id...');
      const { data: newChofer2, error: choferError2 } = await supabase
        .from('choferes')
        .insert({
          user_id: WALTER_USER_ID,
          nombre: 'Walter',
          apellido: 'Zayas',
          email: 'walter@logisticaexpres.com',
          telefono: '+54 9 11 2345-6789',
          dni: '30123456',
          empresa_id: EMPRESA_ID
        })
        .select();

      if (choferError2) {
        console.error('   ❌ Error:', choferError2.message);
        process.exit(1);
      }
      
      console.log('   ✅ Chofer creado exitosamente (con empresa_id)!');
      console.log(`   ID: ${newChofer2[0].id}`);
      console.log(`   Nombre: ${newChofer2[0].nombre} ${newChofer2[0].apellido}`);
    } else {
      console.log('   ✅ Chofer creado exitosamente!');
      console.log(`   ID: ${newChofer[0].id}`);
      console.log(`   Nombre: ${newChofer[0].nombre} ${newChofer[0].apellido}`);
    }
    console.log('');

    // 3. Verificar creación
    console.log('3️⃣ Verificando registro creado...');
    const { data: verification } = await supabase
      .from('choferes')
      .select('*')
      .eq('user_id', WALTER_USER_ID);

    if (verification && verification.length > 0) {
      console.log('   ✅ Verificación exitosa');
      console.log(`   ID: ${verification[0].id}`);
      console.log(`   Nombre: ${verification[0].nombre} ${verification[0].apellido}`);
      console.log(`   Email: ${verification[0].email}`);
      console.log(`   DNI: ${verification[0].dni}`);
      console.log(`   Empresa ID: ${verification[0].id_transporte || verification[0].empresa_id}`);
      console.log(`   User ID: ${verification[0].user_id}`);
    }
    console.log('');

    console.log('═══════════════════════════════════════════');
    console.log('✅ REGISTRO CREADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('📱 Ahora Walter puede:');
    console.log('   ✅ Ver sus viajes asignados');
    console.log('   ✅ Recibir nuevos viajes');
    console.log('   ✅ Actualizar estados de entregas');
    console.log('');
    console.log('🎯 Próximo paso:');
    console.log('   Asignar un viaje a Walter desde el coordinador');
    console.log('');

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

main();

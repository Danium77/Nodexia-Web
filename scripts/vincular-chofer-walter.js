/**
 * Script para vincular el chofer existente con el usuario Walter
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
  console.log('🔗 VINCULANDO CHOFER EXISTENTE CON USUARIO WALTER\n');

  try {
    // 1. Buscar chofer por DNI o email
    console.log('1️⃣ Buscando chofer existente...');
    const { data: chofer, error: searchError } = await supabase
      .from('choferes')
      .select('*')
      .or('dni.eq.30123456,email.ilike.%walter%');

    if (searchError) {
      console.error('   ❌ Error:', searchError.message);
      process.exit(1);
    }

    if (!chofer || chofer.length === 0) {
      console.log('   ❌ No se encontró ningún chofer');
      process.exit(1);
    }

    console.log(`   ✅ Encontrado: ${chofer[0].nombre || 'Sin nombre'} ${chofer[0].apellido || ''}`);
    console.log(`   ID: ${chofer[0].id}`);
    console.log(`   DNI: ${chofer[0].dni || 'N/A'}`);
    console.log(`   Email: ${chofer[0].email || 'N/A'}`);
    console.log(`   User ID actual: ${chofer[0].user_id || 'NO VINCULADO'}`);
    console.log('');

    // 2. Actualizar con user_id
    console.log('2️⃣ Vinculando con user_id...');
    const { data: updated, error: updateError } = await supabase
      .from('choferes')
      .update({
        user_id: WALTER_USER_ID,
        nombre: 'Walter',
        apellido: 'Zayas',
        email: 'walter@logisticaexpres.com',
        telefono: chofer[0].telefono || '+54 9 11 2345-6789'
      })
      .eq('id', chofer[0].id)
      .select();

    if (updateError) {
      console.error('   ❌ Error:', updateError.message);
      process.exit(1);
    }

    console.log('   ✅ Vinculación exitosa!');
    console.log('');

    // 3. Verificar
    console.log('3️⃣ Verificando vinculación...');
    const { data: verification } = await supabase
      .from('choferes')
      .select('*')
      .eq('id', chofer[0].id);

    if (verification && verification.length > 0) {
      console.log('   ✅ Verificación exitosa');
      console.log(`   ID: ${verification[0].id}`);
      console.log(`   Nombre: ${verification[0].nombre} ${verification[0].apellido}`);
      console.log(`   Email: ${verification[0].email}`);
      console.log(`   DNI: ${verification[0].dni}`);
      console.log(`   User ID: ${verification[0].user_id}`);
      console.log(`   Empresa: ${verification[0].id_transporte || 'N/A'}`);
    }
    console.log('');

    console.log('═══════════════════════════════════════════');
    console.log('✅ VINCULACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('📱 Ahora Walter puede:');
    console.log('   ✅ Acceder a su perfil desde la app');
    console.log('   ✅ Ver viajes asignados');
    console.log('   ✅ Actualizar estados');
    console.log('');
    console.log('🎯 Próximo paso:');
    console.log('   Recargar la app en el celular');
    console.log('   Login nuevamente si es necesario');
    console.log('');

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

main();

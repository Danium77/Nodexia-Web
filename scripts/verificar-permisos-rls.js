// Script para verificar y arreglar permisos RLS para choferes
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WALTER_USER_ID = '50da5768-b203-4719-ad16-62e03e2b151a';

async function verificarPermisos() {
  console.log('🔍 VERIFICANDO PERMISOS RLS PARA CHOFERES\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // 1. Obtener el chofer
    const { data: chofer } = await supabase
      .from('choferes')
      .select('id')
      .eq('user_id', WALTER_USER_ID)
      .single();

    console.log('✅ Chofer ID:', chofer.id);
    console.log('');

    // 2. Intentar actualizar el viaje como si fuera Walter (sin service role)
    console.log('2️⃣ INTENTANDO ACTUALIZAR VIAJE CON USUARIO WALTER...\n');
    
    const supabaseCliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Simular autenticación
    const { data: authData } = await supabaseCliente.auth.signInWithPassword({
      email: 'walter@logisticaexpres.com',
      password: 'WalterZayas2025!'
    });

    if (!authData.user) {
      console.error('❌ No se pudo autenticar como Walter');
      return;
    }

    console.log('✅ Autenticado como Walter');

    // Obtener viaje asignado
    const { data: viaje, error: errorViaje } = await supabaseCliente
      .from('viajes_despacho')
      .select('id, numero_viaje, estado')
      .eq('id_chofer', chofer.id)
      .single();

    if (errorViaje) {
      console.error('❌ Error leyendo viaje:', errorViaje);
      return;
    }

    console.log('✅ Viaje leído:', viaje);
    console.log('');

    // Intentar actualizar
    console.log('3️⃣ INTENTANDO ACTUALIZAR ESTADO...\n');
    const { data: updated, error: errorUpdate } = await supabaseCliente
      .from('viajes_despacho')
      .update({ 
        estado: 'confirmado',
        fecha_confirmacion_chofer: new Date().toISOString()
      })
      .eq('id', viaje.id)
      .select();

    if (errorUpdate) {
      console.error('❌ ERROR AL ACTUALIZAR:', errorUpdate);
      console.log('');
      console.log('⚠️  DIAGNÓSTICO:');
      console.log('   El chofer puede LEER los viajes pero NO puede ACTUALIZARLOS');
      console.log('   Esto es un problema de RLS (Row Level Security)');
      console.log('');
      console.log('📝 SOLUCIÓN NECESARIA:');
      console.log('   Crear política RLS en Supabase para permitir UPDATE a choferes');
      console.log('');
    } else {
      console.log('✅ ACTUALIZACIÓN EXITOSA:', updated);
    }

    // Cerrar sesión
    await supabaseCliente.auth.signOut();

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarPermisos();

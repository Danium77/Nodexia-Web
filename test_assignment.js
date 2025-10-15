const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAssignment() {
  console.log('🧪 === PROBANDO ASIGNACIÓN DE TRANSPORTE ===');
  
  try {
    // Obtener el despacho más reciente
    const { data: despachos, error: fetchError } = await supabase
      .from('despachos')
      .select('*')
      .eq('estado', 'pendiente_transporte')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('❌ Error buscando despachos:', fetchError);
      return;
    }

    if (!despachos || despachos.length === 0) {
      console.log('❌ No hay despachos pendientes');
      return;
    }

    const despacho = despachos[0];
    console.log(`📦 Despacho a actualizar: ${despacho.pedido_id} (ID: ${despacho.id})`);

    // Intentar hacer la asignación
    const updateData = {
      transport_id: '3ef28c80-155b-440e-97fe-f6c10d81270b', // ID del transporte existente
      estado: 'transporte_asignado',
      comentarios: 'Prueba de asignación manual'
    };

    console.log('📝 Datos a actualizar:', updateData);

    const { data: resultado, error: updateError } = await supabase
      .from('despachos')
      .update(updateData)
      .eq('id', despacho.id)
      .select('*');

    if (updateError) {
      console.error('❌ Error en la actualización:', updateError);
      console.error('Detalles:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return;
    }

    console.log('✅ Actualización exitosa!');
    console.log('Resultado:', resultado);

    // Verificar que se guardó
    const { data: verificacion, error: verifyError } = await supabase
      .from('despachos')
      .select('*')
      .eq('id', despacho.id)
      .single();

    if (verifyError) {
      console.error('❌ Error en verificación:', verifyError);
    } else {
      console.log('✅ Verificación - Estado actual:', verificacion.estado);
      console.log('✅ Verificación - Transport ID:', verificacion.transport_id);
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testAssignment();
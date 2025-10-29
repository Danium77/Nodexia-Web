/**
 * Script para verificar datos del usuario Gonzalo
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserGonzalo() {
  try {
    console.log('\n🔍 Verificando usuario Gonzalo...\n');
    
    const userId = '3d54e9c6-ea04-4c51-86c4-41abe3968308';
    
    // 1. Datos de Auth
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('❌ Error en Auth:', authError.message);
      return;
    }
    
    console.log('📧 Email:', user.email);
    console.log('✅ Email confirmado:', user.email_confirmed_at ? 'Sí' : 'No');
    console.log('📝 Metadata:', JSON.stringify(user.user_metadata, null, 2));
    
    // 2. Datos de usuarios_empresa
    console.log('\n📊 Vínculo usuarios_empresa:');
    const { data: relacionData, error: relacionError } = await supabase
      .from('usuarios_empresa')
      .select(`
        user_id,
        empresa_id,
        rol_interno,
        activo,
        empresas (
          id,
          nombre,
          tipo_empresa
        )
      `)
      .eq('user_id', userId)
      .single();
    
    if (relacionError) {
      console.error('❌ Error en usuarios_empresa:', relacionError.message);
      return;
    }
    
    console.log('🏢 Empresa:', relacionData.empresas.nombre);
    console.log('🏭 Tipo empresa:', relacionData.empresas.tipo_empresa);
    console.log('👤 Rol interno:', relacionData.rol_interno);
    console.log('✓ Activo:', relacionData.activo);
    
    // 3. Verificar tabla empresas directamente
    console.log('\n🔎 Verificación directa tabla empresas:');
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nombre, tipo_empresa')
      .eq('id', relacionData.empresa_id)
      .single();
    
    if (empresaError) {
      console.error('❌ Error:', empresaError.message);
    } else {
      console.log('🏢 Empresa (directa):', empresaData.nombre);
      console.log('🏭 Tipo (directo):', empresaData.tipo_empresa);
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserGonzalo();

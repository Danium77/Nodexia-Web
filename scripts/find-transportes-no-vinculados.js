require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findTransportesNoVinculados() {
  console.log('🔍 Buscando transportes NO vinculados con Aceitera San Miguel...\n');
  
  const aceiteraId = '3cc1979e-1672-48b8-a5e5-2675f5cac527';
  
  // 1. Obtener todos los transportes
  const { data: transportes } = await supabase
    .from('empresas')
    .select('id, nombre, email, tipo_empresa')
    .eq('tipo_empresa', 'transporte')
    .eq('activo', true);
  
  console.log(`📋 Total transportes activos: ${transportes?.length || 0}\n`);
  
  // 2. Obtener todas las relaciones con Aceitera
  const { data: relacionesAceitera } = await supabase
    .from('relaciones_empresas')
    .select('empresa_transporte_id')
    .eq('empresa_cliente_id', aceiteraId)
    .eq('estado', 'activa');
  
  const transportesVinculados = new Set(
    relacionesAceitera?.map(r => r.empresa_transporte_id) || []
  );
  
  console.log(`🔗 Transportes vinculados con Aceitera: ${transportesVinculados.size}\n`);
  
  // 3. Filtrar transportes NO vinculados
  const transportesNoVinculados = transportes?.filter(
    t => !transportesVinculados.has(t.id)
  );
  
  console.log(`✅ Transportes NO vinculados con Aceitera: ${transportesNoVinculados?.length || 0}\n`);
  
  // 4. Para cada transporte no vinculado, buscar usuarios
  for (const transporte of transportesNoVinculados || []) {
    console.log(`🚚 ${transporte.nombre}`);
    console.log(`   ID: ${transporte.id}`);
    
    const { data: usuarios } = await supabase
      .from('usuarios_empresa')
      .select(`
        user_id,
        auth_users:user_id(email),
        roles_empresa:rol_empresa_id(nombre_rol)
      `)
      .eq('empresa_id', transporte.id)
      .eq('activo', true);
    
    if (usuarios && usuarios.length > 0) {
      console.log(`   👥 Usuarios:`);
      usuarios.forEach(u => {
        const email = u.auth_users?.[0]?.email || 'N/A';
        const rol = u.roles_empresa?.nombre_rol || 'N/A';
        console.log(`      - ${email} (${rol})`);
      });
    } else {
      console.log(`   ⚠️  Sin usuarios activos`);
    }
    console.log('');
  }
  
  // 5. Sugerencias
  console.log('\n💡 SUGERENCIAS:');
  console.log('Si un transporte no tiene usuarios, puedes crear uno o usar transportes de prueba.');
  console.log('Contraseñas típicas del sistema: Luis2025!, walter123, etc.\n');
}

findTransportesNoVinculados().catch(console.error);

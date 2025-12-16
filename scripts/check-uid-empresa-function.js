require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFunction() {
  console.log('🔍 Verificando función uid_empresa()...\n');
  
  // Verificar si la función existe
  const { data, error } = await supabase
    .from('pg_proc')
    .select('proname, prosrc')
    .eq('proname', 'uid_empresa');
  
  if (error) {
    console.log('❌ No se puede consultar pg_proc:', error.message);
  } else if (!data || data.length === 0) {
    console.log('❌ La función uid_empresa NO EXISTE');
    console.log('\n📋 Ejecuta este SQL en Supabase Dashboard:\n');
    console.log(`
CREATE OR REPLACE FUNCTION public.uid_empresa()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id 
  FROM usuarios_empresa 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.uid_empresa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.uid_empresa() TO anon;
    `);
  } else {
    console.log('✅ Función uid_empresa existe');
    console.log('Código:', data[0].prosrc);
  }
  
  // Probar con un usuario específico
  console.log('\n🧪 Probando consulta manual...');
  const userId = '3d54e9c6-ea04-4c51-86c4-41abe3968308'; // Gonzalo Logística Express
  
  const { data: empresa, error: err } = await supabase
    .from('usuarios_empresa')
    .select('empresa_id')
    .eq('user_id', userId)
    .single();
  
  if (empresa) {
    console.log('✅ Empresa ID para user_id:', empresa.empresa_id);
  } else {
    console.log('❌ Error:', err?.message);
  }
}

checkFunction().catch(console.error);

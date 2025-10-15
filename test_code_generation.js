const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para generar código único de despacho (copiada del código)
const generateDespachoCode = async () => {
  console.log('=== GENERANDO CÓDIGO DE DESPACHO ===');
  
  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `DSP-${dateStr}`;
    
    console.log('Fecha hoy:', today.toISOString());
    console.log('Fecha string:', dateStr);
    console.log('Prefix:', prefix);
    
    // Buscar el último número del día
    const { data: lastDespacho, error: queryError } = await supabase
      .from('despachos')
      .select('pedido_id')
      .ilike('pedido_id', `${prefix}-%`)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (queryError) {
      console.error('❌ Error en query:', queryError);
      return null;
    }
    
    console.log('Último despacho encontrado:', lastDespacho);
    
    let nextNumber = 1;
    if (lastDespacho && lastDespacho.length > 0) {
      const lastCode = lastDespacho[0].pedido_id;
      console.log('Último código:', lastCode);
      const lastNumber = parseInt(lastCode.split('-')[2]) || 0;
      console.log('Último número:', lastNumber);
      nextNumber = lastNumber + 1;
    }
    
    const finalCode = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
    console.log('✅ Código generado:', finalCode);
    
    return finalCode;
    
  } catch (error) {
    console.error('💥 Error generando código:', error);
    return null;
  }
};

// Probar la función
(async () => {
  const code = await generateDespachoCode();
  console.log('\n🔄 RESULTADO FINAL:', code);
})();
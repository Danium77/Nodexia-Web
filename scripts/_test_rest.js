// Simulate browser PostgREST queries using production Supabase REST API
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://lkdcofsfjnltuzzzwoir.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGNvZnNmam5sdHV6enp3b2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3Mzg3NzMsImV4cCI6MjA1MTMxNDc3M30.B-0BrHlVPALaWKdRXxWiB3eqvdUMz_rsgRJHWwRkVL8';

// Abel Ramirez credentials - from docs or test
const ABEL_EMAIL = 'coordinador@tecnopackzayas.com'; // Will need actual email
const ABEL_PASSWORD = ''; // Will need actual password

const supabase = createClient(PROD_URL, PROD_ANON_KEY);

(async () => {
  try {
    // Instead of logging in, use service role to simulate
    // But we don't have prod service role key
    // Let's use anon without auth first to test PostgREST itself
    
    // Test PostgREST availability
    console.log('Testing PostgREST against production...');
    
    // Query empresas (should work even without auth due to USING(true))
    const { data: empresas, error: empError } = await supabase
      .from('empresas')
      .select('id, nombre')
      .ilike('nombre', '%tecnopack%');
    
    console.log('empresas query error:', empError?.message || 'none');
    console.log('empresas data:', JSON.stringify(empresas));

    // Query ubicaciones
    if (empresas && empresas.length > 0) {
      const empId = empresas[0].id;
      
      const { data: ubis, error: ubiError } = await supabase
        .from('ubicaciones')
        .select('id, nombre')
        .or(`empresa_id.eq.${empId}`);
      
      console.log('ubicaciones error:', ubiError?.message || 'none');
      console.log('ubicaciones:', JSON.stringify(ubis));

      if (ubis && ubis.length > 0) {
        const ubiIds = ubis.map(u => u.id);
        
        // Query recepciones (despachos with destino_id matching)
        const { data: receps, error: recError } = await supabase
          .from('despachos')
          .select('id, pedido_id, destino, scheduled_local_date, scheduled_local_time, created_by')
          .in('destino_id', ubiIds)
          .order('created_at', { ascending: true });
        
        console.log('despachos(recepciones) error:', recError?.message || 'none');
        console.log('despachos(recepciones):', JSON.stringify(receps));
      }
    }

    // Also test direct despachos query
    const { data: allDesps, error: allError } = await supabase
      .from('despachos')
      .select('id, pedido_id, destino')
      .limit(5);
    console.log('\nAll despachos (limit 5) error:', allError?.message || 'none');
    console.log('All despachos:', JSON.stringify(allDesps));

  } catch (err) {
    console.error('Script error:', err.message);
  }
})();

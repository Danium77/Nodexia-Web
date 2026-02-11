const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
const c = createClient(url, key);

async function check() {
  // Try inserting into documentos_viaje_seguro with columns we expect
  const testData = {
    viaje_id: 'eb3b44af-cb9d-46c3-af4e-b187f3d4e4ee',
    tipo_documento: 'remito',
    url_archivo: 'https://test.example.com/test.jpg',
    nombre_archivo: 'test_remito.jpg',
    subido_por: 'e5f213c7-b02b-46f5-8bd1-4b4d11aaa6b9',
  };

  const { data, error } = await c
    .from('documentos_viaje_seguro')
    .insert(testData)
    .select();

  if (error) {
    console.log('Insert error:', error.message, error.details, error.hint);
    
    // Try with just viaje_id to see what's required
    const { error: e2 } = await c
      .from('documentos_viaje_seguro')
      .insert({ viaje_id: 'eb3b44af-cb9d-46c3-af4e-b187f3d4e4ee' })
      .select();
    console.log('Minimal insert error:', e2?.message, e2?.details);
  } else {
    console.log('Insert OK:', JSON.stringify(data, null, 2));
    // Clean up test
    if (data?.[0]?.id) {
      await c.from('documentos_viaje_seguro').delete().eq('id', data[0].id);
      console.log('Cleaned up test record');
    }
  }
}

check();

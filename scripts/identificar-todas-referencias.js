// Identificar TODAS las tablas con referencias a empresas
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function identificarTodasLasReferencias() {
  console.log('🔍 IDENTIFICANDO TODAS LAS REFERENCIAS A EMPRESAS DUPLICADAS\n');

  const uuids_duplicados = [
    '7963398f-a47d-418e-a2d5-d09414488318',
    '205f74a3-d170-4bd2-9c58-31a30de6e83c',
    '4b9d7656-fd07-41ee-a990-f1b20640a333',
    'c7a88a4a-204c-42c0-9c5e-aa009b8e9b78',
    'b253877d-4571-4390-ba5f-9b327de0a7a2'
  ];

  // Lista de tablas posibles que podrían tener FKs a empresas
  const tablasPosibles = [
    { tabla: 'viajes_despacho', columnas: ['id_transporte', 'empresa_id'] },
    { tabla: 'despachos', columnas: ['empresa_transporte_id', 'transport_id', 'empresa_id'] },
    { tabla: 'relaciones_empresas', columnas: ['empresa_cliente_id', 'empresa_transporte_id'] },
    { tabla: 'usuarios_empresa', columnas: ['empresa_id'] },
    { tabla: 'choferes', columnas: ['empresa_id'] },
    { tabla: 'camiones', columnas: ['empresa_id'] },
    { tabla: 'acoplados', columnas: ['empresa_id'] },
    { tabla: 'ofertas_red_nodexia', columnas: ['empresa_planta_id', 'empresa_transporte_tomadora_id'] },
    { tabla: 'despachos_red', columnas: ['empresa_cliente_id', 'empresa_transporte_id'] }
  ];

  console.log('📊 Referencias encontradas por tabla:\n');

  for (const { tabla, columnas } of tablasPosibles) {
    for (const columna of columnas) {
      try {
        for (const uuid of uuids_duplicados) {
          const { data, error } = await supabase
            .from(tabla)
            .select('id')
            .eq(columna, uuid);

          if (!error && data && data.length > 0) {
            console.log(`✅ ${tabla}.${columna}: ${data.length} registros con UUID ${uuid.substring(0, 8)}...`);
          }
        }
      } catch (err) {
        // Tabla o columna no existe, continuar
      }
    }
  }

  console.log('\n✅ Análisis completado');
}

identificarTodasLasReferencias().catch(console.error);

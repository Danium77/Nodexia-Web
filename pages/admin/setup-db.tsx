import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SetupDB() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const createView = async () => {
    setLoading(true);
    try {
      // Crear la vista
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
          -- Vista completa de empresas con información de planes
          CREATE OR REPLACE VIEW view_empresas_completa AS
          SELECT 
              e.id,
              e.nombre,
              e.cuit,
              e.email,
              e.activa,
              e.created_at,
              e.updated_at,
              tee.nombre AS tipo_ecosistema,
              ps.nombre AS plan_nombre,
              ps.precio_mensual,
              ps.limite_usuarios,
              ps.limite_vehiculos,
              ps.limite_choferes
          FROM empresas e
          LEFT JOIN tipos_empresa_ecosistema tee ON e.tipo_empresa_id = tee.id
          LEFT JOIN planes_suscripcion ps ON e.plan_id = ps.id
          ORDER BY e.created_at DESC;
        `
      });

      if (error) throw error;
      setResult('Vista creada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testView = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('view_empresas_completa')
        .select('*');

      if (error) throw error;
      setResult(`Vista funciona! Encontrados ${data?.length} registros`);
      console.log('Datos de la vista:', data);
    } catch (error) {
      console.error('Error:', error);
      setResult(`Error probando vista: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-6">Setup Database</h1>
      
      <div className="space-y-4">
        <button
          onClick={createView}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear Vista'}
        </button>

        <button
          onClick={testView}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 ml-4"
        >
          {loading ? 'Probando...' : 'Probar Vista'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function CamionDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const [camion, setCamion] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCamion();
      fetchDocumentos();
    }
    // eslint-disable-next-line
  }, [id]);

  async function fetchCamion() {
    setLoading(true);
    const { data } = await supabase.from('camiones').select('*').eq('id', id).single();
    setCamion(data);
    setLoading(false);
  }

  async function fetchDocumentos() {
    const { data } = await supabase.from('documentos').select('*').eq('entidad', 'camion').eq('id_entidad', id);
    setDocumentos(data || []);
  }

  if (loading || !camion) return <div className="p-8 text-gray-200">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-2 flex flex-col items-center">
      <button
        className="mb-6 self-start bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded shadow font-semibold transition"
        onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/transporte/flota'}
      >
        ← Volver
      </button>
      <div className="w-full max-w-2xl flex flex-col items-center bg-gray-800 rounded shadow-2xl p-2 mb-2 border border-gray-700">
        {camion.foto_url && (
          <img src={camion.foto_url} alt="Foto camión" className="w-56 h-40 object-cover rounded mb-4 border-4 border-green-600 shadow-lg" />
        )}
        <h2 className="text-3xl font-bold text-green-300 mb-2 tracking-wide">Patente: <span className="text-white">{camion.patente}</span></h2>
        <div className="flex gap-2 text-sm mt-2">
          <div className="text-gray-300">Marca: <span className="font-semibold text-white">{camion.marca}</span></div>
          <div className="text-gray-300">Modelo: <span className="font-semibold text-white">{camion.modelo}</span></div>
          <div className="text-gray-300">Año: <span className="font-semibold text-white">{camion.anio}</span></div>
        </div>
      </div>
      <div className="w-full max-w-2xl bg-gray-700 rounded-xl p-6 shadow border border-gray-600">
        <h3 className="text-xl font-bold text-green-300 mb-4">Documentación</h3>
        {documentos.length === 0 ? (
          <div className="text-gray-400">No hay documentación cargada para este camión.</div>
        ) : (
          <table className="w-full text-gray-200">
            <thead>
              <tr>
                <th className="p-2">Tipo</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id}>
                  <td className="p-2">{doc.tipo}</td>
                  <td className="p-2">{doc.nombre_archivo}</td>
                  <td className="p-2">{doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleDateString() : ''}</td>
                  <td className="p-2">
                    <a href={`https://<your-supabase-url>/storage/v1/object/public/${doc.bucket}/${doc.path}`} target="_blank" rel="noopener noreferrer" className="text-green-400 underline">Ver</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

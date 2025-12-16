import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ChoferDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const [chofer, setChofer] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchChofer();
  }, [id]);

  async function fetchChofer() {
    setLoading(true);
    const { data } = await supabase.from('choferes').select('*').eq('id', id).single();
    setChofer(data);
    fetchDocumentos(data?.id);
    setLoading(false);
  }

  async function fetchDocumentos(choferId: string) {
    if (!choferId) return;
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('entidad', 'chofer')
      .eq('id_entidad', choferId)
      .order('fecha_subida', { ascending: false });
    setDocumentos(data || []);
  }

  if (loading) return <div className="text-gray-300 p-8">Cargando...</div>;
  if (!chofer) return <div className="text-red-400 p-8">Chofer no encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl shadow p-6 mt-8 border border-gray-700">
      <button
        className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-1 rounded shadow font-semibold transition text-sm mb-4"
        onClick={() => router.back()}
      >
        ← Volver
      </button>
      <div className="flex flex-col md:flex-row gap-6 items-center mb-6">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
          {chofer.foto_url ? (
            <img src={chofer.foto_url} alt="Foto chofer" className="object-cover w-full h-full" />
          ) : (
            <span className="text-gray-400">Sin foto</span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-green-300 mb-1">{chofer.nombre} {chofer.apellido}</h2>
          <div className="text-gray-200 mb-1"><span className="font-semibold">DNI:</span> {chofer.dni}</div>
          <div className="text-gray-200 mb-1"><span className="font-semibold">Teléfono:</span> {chofer.telefono || '-'}</div>
          <div className="text-gray-200 mb-1"><span className="font-semibold">Email:</span> {chofer.email || '-'}</div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-green-300 mb-2">Documentación</h3>
        {documentos.length === 0 ? (
          <div className="text-gray-400">Sin documentos cargados.</div>
        ) : (
          <ul className="space-y-2">
            {documentos.map((doc) => (
              <li key={doc.id} className="bg-gray-700 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-semibold text-gray-200">{doc.tipo}</span>
                  <span className="text-gray-400 ml-2">{doc.nombre_archivo}</span>
                </div>
                <a href={`https://<your-supabase-project-id>.supabase.co/storage/v1/object/public/${doc.bucket}/${doc.path}`} target="_blank" rel="noopener noreferrer" className="text-green-400 underline mt-2 md:mt-0">Ver archivo</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/layout/AdminLayout';
import { supabase } from '../../../lib/supabaseClient';

interface TransporteDetalle {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
}

const TransporteDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [transporte, setTransporte] = useState<TransporteDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTransporte = async (transporteId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', transporteId)
        .eq('tipo_empresa', 'transporte')
        .single();
      
      if (error) throw error;
      
      const transporteData: TransporteDetalle = {
        id: data.id,
        nombre: data.nombre || '',
        cuit: data.cuit || '',
        direccion: data.direccion || '',
        localidad: data.localidad || '',
        provincia: data.provincia || '',
        telefono: data.telefono || '',
        email: data.email || ''
      };
      
      setTransporte(transporteData);
    } catch (err) {
      console.error('Error fetch transporte:', err);
      router.push('/configuracion/transportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    fetchTransporte(id);
  }, [id]);

  if (loading) {
    return (
      <AdminLayout pageTitle="Cargando...">
        <div className="text-center text-white">Cargando información del transporte...</div>
      </AdminLayout>
    );
  }

  if (!transporte) {
    return (
      <AdminLayout pageTitle="Transporte no encontrado">
        <div className="text-center text-white">
          <p>Transporte no encontrado.</p>
          <button
            onClick={() => router.push('/configuracion/transportes')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Volver a Transportes
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={`Transporte: ${transporte.nombre}`}>
      <button
        className="mb-6 flex items-center text-blue-400 hover:text-blue-200 font-semibold"
        onClick={() => router.push('/configuracion/transportes')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a Transportes
      </button>

      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-blue-400 mb-6">Información del Transporte</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2">Nombre de la Empresa</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.nombre}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">CUIT</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.cuit}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.email || 'No especificado'}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Teléfono</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.telefono || 'No especificado'}</div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-300 mb-2">Dirección</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.direccion || 'No especificada'}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Localidad</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.localidad || 'No especificada'}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Provincia</label>
            <div className="bg-gray-900 p-3 rounded text-white">{transporte.provincia || 'No especificada'}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push('/configuracion/transportes')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
          >
            Volver
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TransporteDetail;
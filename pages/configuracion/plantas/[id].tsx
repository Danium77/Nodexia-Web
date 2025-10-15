import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/layout/AdminLayout';
import { supabase } from '../../../lib/supabaseClient';

interface PlantaDetalle {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
}

const PlantaDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [planta, setPlanta] = useState<PlantaDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPlanta = async (plantaId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', plantaId)
        .eq('tipo_empresa', 'coordinador')
        .single();
      
      if (error) throw error;
      
      // Verificar que sea una planta
      const configuracion = data.configuracion_empresa;
      if (!configuracion || configuracion.tipo_instalacion !== 'planta') {
        throw new Error('No es una planta válida');
      }
      
      const plantaData: PlantaDetalle = {
        id: data.id,
        nombre: data.nombre || '',
        cuit: data.cuit || '',
        direccion: data.direccion || '',
        localidad: data.localidad || '',
        provincia: data.provincia || '',
        telefono: data.telefono || '',
        email: data.email || ''
      };
      
      setPlanta(plantaData);
    } catch (err) {
      console.error('Error fetch planta:', err);
      router.push('/configuracion/plantas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    fetchPlanta(id);
  }, [id]);

  if (loading) {
    return (
      <AdminLayout pageTitle="Cargando...">
        <div className="text-center text-white">Cargando información de la planta...</div>
      </AdminLayout>
    );
  }

  if (!planta) {
    return (
      <AdminLayout pageTitle="Planta no encontrada">
        <div className="text-center text-white">
          <p>Planta no encontrada.</p>
          <button
            onClick={() => router.push('/configuracion/plantas')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Volver a Plantas
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={`Planta: ${planta.nombre}`}>
      <button
        className="mb-6 flex items-center text-blue-400 hover:text-blue-200 font-semibold"
        onClick={() => router.push('/configuracion/plantas')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a Plantas
      </button>

      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-blue-400 mb-6">Información de la Planta</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2">Nombre de la Planta</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.nombre}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">CUIT</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.cuit}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.email || 'No especificado'}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Teléfono</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.telefono || 'No especificado'}</div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-300 mb-2">Dirección</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.direccion || 'No especificada'}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Localidad</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.localidad || 'No especificada'}</div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Provincia</label>
            <div className="bg-gray-900 p-3 rounded text-white">{planta.provincia || 'No especificada'}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push('/configuracion/plantas')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
          >
            Volver
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PlantaDetail;
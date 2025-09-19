import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface Planta {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion: string;
  telefono: string;
  tipo: string; // planta, deposito, sucursal, etc.
  documentacion: string[];
}

const PlantasPage = () => {
  const router = useRouter();
  const [filtro, setFiltro] = useState('');
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [cuitInput, setCuitInput] = useState('');
  const [nuevaPlanta, setNuevaPlanta] = useState<Planta | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar plantas asociadas al coordinador
  useEffect(() => {
    // TODO: Reemplazar por consulta real a la base de datos de plantas asociadas
    setPlantas([]);
  }, []);

  // Buscar planta por CUIT en la red Nodexia
  const buscarPlantaPorCuit = async () => {
    setMensaje('');
    setNuevaPlanta(null);
    setLoading(true);
    // TODO: Reemplazar por consulta real a la red Nodexia
    // Simulación: si el CUIT termina en 2, existe; si no, no existe
    if (cuitInput.trim().endsWith('2')) {
      setNuevaPlanta({
        id: 'demo-id',
        nombre: 'Planta Demo S.A.',
        cuit: cuitInput.trim(),
        direccion: 'Av. Planta 456',
        localidad: 'Ciudad Planta',
        provincia: 'Provincia Planta',
        ubicacion: 'Lat: -34.7, Lng: -58.5',
        telefono: '011-9876-5432',
        tipo: 'planta',
        documentacion: ['Habilitacion.pdf', 'PlanoUbicacion.pdf'],
      });
    } else {
      setMensaje('La planta/deposito no existe en la red Nodexia. Debe registrarse antes de poder asociarla.');
    }
    setLoading(false);
  };

  // Asociar planta existente
  const asociarPlanta = () => {
    if (!nuevaPlanta) return;
    // TODO: Lógica para asociar la planta al coordinador
    setMensaje('Planta asociada correctamente.');
    setPlantas([...plantas, nuevaPlanta]);
    setNuevaPlanta(null);
    setCuitInput('');
  };

  return (
    <AdminLayout pageTitle="Gestión de Plantas y Depósitos">
      <button
        className="mb-6 flex items-center text-green-400 hover:text-green-200 font-semibold"
        onClick={() => router.push('/configuracion')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Volver
      </button>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Plantas y Depósitos</h2>
        <div className="mb-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-300 mb-1">Filtrar por nombre o CUIT</label>
            <input
              type="text"
              className="w-full rounded px-3 py-2 bg-gray-900 text-white"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar..."
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-300 mb-1">Agregar planta/deposito por CUIT</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="rounded px-3 py-2 bg-gray-900 text-white flex-1"
                value={cuitInput}
                onChange={e => setCuitInput(e.target.value)}
                placeholder="CUIT"
                maxLength={11}
              />
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                onClick={buscarPlantaPorCuit}
                disabled={loading || !cuitInput.trim()}
              >Buscar</button>
            </div>
          </div>
        </div>
        {mensaje && <div className="my-2 text-yellow-400">{mensaje}</div>}
        {nuevaPlanta && (
          <div className="bg-gray-900 rounded p-4 mt-4">
            <h3 className="text-lg font-bold text-green-300 mb-2">Datos de la planta/deposito encontrada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white">
              <div><strong>Nombre:</strong> {nuevaPlanta.nombre}</div>
              <div><strong>CUIT:</strong> {nuevaPlanta.cuit}</div>
              <div><strong>Dirección:</strong> {nuevaPlanta.direccion}</div>
              <div><strong>Localidad:</strong> {nuevaPlanta.localidad}</div>
              <div><strong>Provincia:</strong> {nuevaPlanta.provincia}</div>
              <div><strong>Ubicación:</strong> {nuevaPlanta.ubicacion}</div>
              <div><strong>Teléfono:</strong> {nuevaPlanta.telefono}</div>
              <div><strong>Tipo:</strong> {nuevaPlanta.tipo}</div>
              <div className="col-span-2"><strong>Documentación:</strong> {nuevaPlanta.documentacion.join(', ')}</div>
            </div>
            <button
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              onClick={asociarPlanta}
            >Asociar a mi lista</button>
          </div>
        )}
      </div>
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-green-300 mb-4">Mis plantas y depósitos asociados</h3>
        {plantas.length === 0 ? (
          <div className="text-gray-400">No tienes plantas ni depósitos asociados aún.</div>
        ) : (
          <table className="w-full text-white">
            <thead>
              <tr className="bg-gray-900">
                <th className="p-2">Nombre</th>
                <th className="p-2">CUIT</th>
                <th className="p-2">Dirección</th>
                <th className="p-2">Localidad</th>
                <th className="p-2">Provincia</th>
                <th className="p-2">Teléfono</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Documentación</th>
              </tr>
            </thead>
            <tbody>
              {plantas.filter(p =>
                p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                p.cuit.includes(filtro)
              ).map(p => (
                <tr key={p.id} className="border-b border-gray-700">
                  <td className="p-2">{p.nombre}</td>
                  <td className="p-2">{p.cuit}</td>
                  <td className="p-2">{p.direccion}</td>
                  <td className="p-2">{p.localidad}</td>
                  <td className="p-2">{p.provincia}</td>
                  <td className="p-2">{p.telefono}</td>
                  <td className="p-2">{p.tipo}</td>
                  <td className="p-2">{p.documentacion.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default PlantasPage;

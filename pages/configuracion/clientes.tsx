import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion: string;
  telefono: string;
  documentacion: string[];
}

const ClientesPage = () => {
  const router = useRouter();
  const [filtro, setFiltro] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cuitInput, setCuitInput] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState<Cliente | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar clientes asociados al coordinador
  useEffect(() => {
    // TODO: Reemplazar por consulta real a la base de datos de clientes asociados
    setClientes([]);
  }, []);

  // Buscar cliente por CUIT en la red Nodexia
  const buscarClientePorCuit = async () => {
    setMensaje('');
    setNuevoCliente(null);
    setLoading(true);
    // TODO: Reemplazar por consulta real a la red Nodexia
    // Simulación: si el CUIT termina en 3, existe; si no, no existe
    if (cuitInput.trim().endsWith('3')) {
      setNuevoCliente({
        id: 'demo-id',
        nombre: 'Cliente Demo S.A.',
        cuit: cuitInput.trim(),
        direccion: 'Av. Cliente 789',
        localidad: 'Ciudad Cliente',
        provincia: 'Provincia Cliente',
        ubicacion: 'Lat: -34.8, Lng: -58.6',
        telefono: '011-5555-5555',
        documentacion: ['Contrato.pdf', 'ConstanciaInscripcion.pdf'],
      });
    } else {
      setMensaje('El cliente no existe en la red Nodexia. Debe registrarse antes de poder asociarlo.');
    }
    setLoading(false);
  };

  // Asociar cliente existente
  const asociarCliente = () => {
    if (!nuevoCliente) return;
    // TODO: Lógica para asociar el cliente al coordinador
    setMensaje('Cliente asociado correctamente.');
    setClientes([...clientes, nuevoCliente]);
    setNuevoCliente(null);
    setCuitInput('');
  };

  return (
    <AdminLayout pageTitle="Gestión de Clientes">
      <button
        className="mb-6 flex items-center text-yellow-400 hover:text-yellow-200 font-semibold"
        onClick={() => router.push('/configuracion')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Volver
      </button>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Clientes</h2>
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
            <label className="block text-gray-300 mb-1">Agregar cliente por CUIT</label>
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
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                onClick={buscarClientePorCuit}
                disabled={loading || !cuitInput.trim()}
              >Buscar</button>
            </div>
          </div>
        </div>
        {mensaje && <div className="my-2 text-yellow-400">{mensaje}</div>}
        {nuevoCliente && (
          <div className="bg-gray-900 rounded p-4 mt-4">
            <h3 className="text-lg font-bold text-yellow-300 mb-2">Datos del cliente encontrado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white">
              <div><strong>Nombre:</strong> {nuevoCliente.nombre}</div>
              <div><strong>CUIT:</strong> {nuevoCliente.cuit}</div>
              <div><strong>Dirección:</strong> {nuevoCliente.direccion}</div>
              <div><strong>Localidad:</strong> {nuevoCliente.localidad}</div>
              <div><strong>Provincia:</strong> {nuevoCliente.provincia}</div>
              <div><strong>Ubicación:</strong> {nuevoCliente.ubicacion}</div>
              <div><strong>Teléfono:</strong> {nuevoCliente.telefono}</div>
              <div className="col-span-2"><strong>Documentación:</strong> {nuevoCliente.documentacion.join(', ')}</div>
            </div>
            <button
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
              onClick={asociarCliente}
            >Asociar a mi lista</button>
          </div>
        )}
      </div>
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-yellow-300 mb-4">Mis clientes asociados</h3>
        {clientes.length === 0 ? (
          <div className="text-gray-400">No tienes clientes asociados aún.</div>
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
                <th className="p-2">Documentación</th>
              </tr>
            </thead>
            <tbody>
              {clientes.filter(c =>
                c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                c.cuit.includes(filtro)
              ).map(c => (
                <tr key={c.id} className="border-b border-gray-700">
                  <td className="p-2">{c.nombre}</td>
                  <td className="p-2">{c.cuit}</td>
                  <td className="p-2">{c.direccion}</td>
                  <td className="p-2">{c.localidad}</td>
                  <td className="p-2">{c.provincia}</td>
                  <td className="p-2">{c.telefono}</td>
                  <td className="p-2">{c.documentacion.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientesPage;

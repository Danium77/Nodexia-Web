import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';

interface Despacho {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  scheduled_at: string;
  comentarios?: string;
  prioridad?: string;
  unidad_type?: string;
}

const TransporteDashboard = () => {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDespachos = async () => {
      setLoading(true);
      setError('');
      // TODO: Reemplazar por consulta real filtrando por transporte asignado al usuario
      setDespachos([]);
      setLoading(false);
    };
    fetchDespachos();
  }, []);

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-cyan-600 rounded-lg">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Panel de Transporte</h1>
        </div>
        <p className="text-slate-400">Bienvenido, aquí puedes ver y gestionar tus despachos asignados</p>
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-cyan-300 mb-4">Despachos Asignados</h2>
        {loading ? (
          <div className="text-slate-400">Cargando despachos...</div>
        ) : despachos.length === 0 ? (
          <div className="text-slate-400">No tienes despachos asignados actualmente.</div>
        ) : (
          <table className="w-full text-white">
            <thead>
              <tr className="bg-gray-900">
                <th className="p-2">Pedido</th>
                <th className="p-2">Origen</th>
                <th className="p-2">Destino</th>
                <th className="p-2">Fecha/Hora</th>
                <th className="p-2">Prioridad</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {despachos.map((d) => (
                <tr key={d.id} className="border-b border-gray-700">
                  <td className="p-2">{d.pedido_id}</td>
                  <td className="p-2">{d.origen}</td>
                  <td className="p-2">{d.destino}</td>
                  <td className="p-2">{d.scheduled_at}</td>
                  <td className="p-2">{d.prioridad || '-'}</td>
                  <td className="p-2">{d.estado}</td>
                  <td className="p-2">
                    {/* Acciones según estado, ejemplo: */}
                    <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-sm">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-cyan-300 mb-4">Historial de Despachos</h2>
        {/* TODO: Tabla de despachos finalizados o rechazados */}
        <div className="text-slate-400">Próximamente...</div>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-cyan-300 mb-4">Perfil y Documentación</h2>
        {/* TODO: Mostrar datos del transporte y carga de documentación */}
        <div className="text-slate-400">Próximamente...</div>
      </div>
    </MainLayout>
  );
};

export default TransporteDashboard;

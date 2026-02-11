// pages/viajes.tsx
// Vista de viajes para rol administrativo
import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { TruckIcon, ClockIcon, CheckCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface ViajeAdmin {
  id: string;
  numero_viaje: number;
  estado: string;
  created_at: string;
  despachos?: {
    origen: string;
    destino: string;
    scheduled_local_date: string;
    pedido_id: string;
  };
}

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  pendiente: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
  transporte_asignado: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  cargando: { bg: 'bg-purple-900/30', text: 'text-purple-400' },
  en_camino: { bg: 'bg-cyan-900/30', text: 'text-cyan-400' },
  descargando: { bg: 'bg-indigo-900/30', text: 'text-indigo-400' },
  completado: { bg: 'bg-green-900/30', text: 'text-green-400' },
  cancelado: { bg: 'bg-red-900/30', text: 'text-red-400' },
};

export default function ViajesPage() {
  const { user, empresaId } = useUserRole();
  const [viajes, setViajes] = useState<ViajeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  useEffect(() => {
    if (!empresaId) return;
    
    const fetchViajes = async () => {
      setLoading(true);
      try {
        // Get viajes where the empresa is involved (as transporte)
        const { data, error } = await supabase
          .from('viajes_despacho')
          .select(`
            id, numero_viaje, estado, created_at,
            despachos(origen, destino, scheduled_local_date, pedido_id)
          `)
          .eq('id_transporte', empresaId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setViajes(data.map((v: any) => ({
            ...v,
            despachos: Array.isArray(v.despachos) ? v.despachos[0] : v.despachos,
          })));
        }
      } catch (err) {
        console.error('Error cargando viajes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchViajes();
  }, [empresaId]);

  const viajesFiltrados = filtroEstado === 'todos' 
    ? viajes 
    : viajes.filter(v => v.estado === filtroEstado);

  const estadosUnicos = ['todos', ...new Set(viajes.map(v => v.estado))];

  return (
    <AdminLayout pageTitle="Viajes">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Viajes de la Empresa</h2>
        <p className="text-gray-400 text-sm">Historial y seguimiento de todos los viajes</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {estadosUnicos.map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroEstado === estado
                ? 'bg-cyan-600 text-white'
                : 'bg-[#1b273b] text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {estado === 'todos' ? 'Todos' : estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {estado === 'todos' && ` (${viajes.length})`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="text-gray-400">Cargando viajes...</div>
        </div>
      )}

      {/* Lista */}
      {!loading && viajesFiltrados.length === 0 && (
        <div className="bg-[#1b273b] rounded-lg p-12 border border-gray-800 text-center">
          <TruckIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No se encontraron viajes</p>
        </div>
      )}

      {!loading && viajesFiltrados.length > 0 && (
        <div className="space-y-3">
          {viajesFiltrados.map(viaje => {
            const colors = ESTADO_COLORS[viaje.estado] || { bg: 'bg-gray-800', text: 'text-gray-400' };
            return (
              <div key={viaje.id} className="bg-[#1b273b] rounded-lg p-4 border border-gray-800 hover:border-cyan-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TruckIcon className="h-5 w-5 text-cyan-400" />
                    <div>
                      <span className="text-white font-medium">
                        Viaje #{viaje.numero_viaje}
                      </span>
                      {viaje.despachos?.pedido_id && (
                        <span className="text-gray-500 text-sm ml-2">
                          Pedido: {viaje.despachos.pedido_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {viaje.estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                {viaje.despachos && (
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      {viaje.despachos.origen} → {viaje.despachos.destino}
                    </span>
                    {viaje.despachos.scheduled_local_date && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {new Date(viaje.despachos.scheduled_local_date).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

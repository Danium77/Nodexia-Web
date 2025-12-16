// components/Transporte/ViajesAsignados.tsx
import React, { useState } from 'react';
import { ChevronRightIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';

interface Viaje {
  id: string;
  despacho_id: string;
  pedido_id: string;
  numero_viaje: number;
  origen: string;
  destino: string;
  estado: string;
  scheduled_date: string;
  scheduled_time: string;
  chofer?: {
    nombre: string;
  };
  camion?: {
    patente: string;
  };
}

interface ViajesAsignadosProps {
  viajes: Viaje[];
  onSelectViaje: (viaje: Viaje) => void;
}

const ViajesAsignados: React.FC<ViajesAsignadosProps> = ({ viajes, onSelectViaje }) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const estadosConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    'pendiente': { label: '⏳ Pendiente', color: 'text-gray-400', bgColor: 'bg-gray-600' },
    'transporte_asignado': { label: '✅ Asignado', color: 'text-green-400', bgColor: 'bg-green-600' },
    'cargando': { label: '⬆️ Cargando', color: 'text-orange-400', bgColor: 'bg-orange-600' },
    'en_camino': { label: '🚛 En Camino', color: 'text-blue-400', bgColor: 'bg-blue-600' },
    'descargando': { label: '⬇️ Descargando', color: 'text-amber-400', bgColor: 'bg-amber-600' },
    'completado': { label: '🏁 Completado', color: 'text-green-400', bgColor: 'bg-gray-600' }
  };

  const viajesFiltrados = filtroEstado === 'todos' 
    ? viajes 
    : viajes.filter(v => v.estado === filtroEstado);

  return (
    <div className="bg-[#1b273b] rounded-lg border border-gray-800">
      {/* Header con filtros */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-bold text-cyan-400">🚛 Viajes Asignados</h3>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-[#0a0e1a] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="transporte_asignado">Asignados</option>
          <option value="cargando">Cargando</option>
          <option value="en_camino">En Camino</option>
          <option value="descargando">Descargando</option>
          <option value="completado">Completados</option>
        </select>
      </div>

      {/* Lista de viajes */}
      <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
        {viajesFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <TruckIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p>No hay viajes {filtroEstado !== 'todos' ? 'con este estado' : 'asignados'}</p>
          </div>
        ) : (
          viajesFiltrados.map((viaje) => {
            const estadoConfig = estadosConfig[viaje.estado] || estadosConfig['pendiente'];
            
            return (
              <div
                key={viaje.id}
                onClick={() => onSelectViaje(viaje)}
                className="p-4 hover:bg-gray-800/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {/* Pedido y Viaje */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-white">{viaje.pedido_id}</span>
                      <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded">
                        Viaje #{viaje.numero_viaje}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${estadoConfig?.bgColor || 'bg-gray-500'} text-white`}>
                        {estadoConfig?.label || viaje.estado}
                      </span>
                    </div>

                    {/* Ruta */}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{viaje.origen}</span>
                      <ChevronRightIcon className="h-4 w-4" />
                      <span>{viaje.destino}</span>
                    </div>

                    {/* Info adicional */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📅 {viaje.scheduled_date}</span>
                      <span>🕐 {viaje.scheduled_time}</span>
                      {viaje.chofer && <span>👤 {viaje.chofer.nombre}</span>}
                      {viaje.camion && <span>🚛 {viaje.camion.patente}</span>}
                    </div>
                  </div>

                  <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ViajesAsignados;

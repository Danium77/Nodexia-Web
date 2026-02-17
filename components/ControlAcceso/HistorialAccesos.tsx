// components/ControlAcceso/HistorialAccesos.tsx
// Shows today's access history (last 20 records)

import { ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface RegistroAcceso {
  id: string;
  viaje_id: string;
  tipo: 'ingreso' | 'egreso';
  timestamp: string;
  numero_viaje: string;
  chofer_nombre: string;
  camion_patente: string;
}

interface HistorialAccesosProps {
  historial: RegistroAcceso[];
  loadingHistorial: boolean;
  onActualizar: () => void;
}

export default function HistorialAccesos({ historial, loadingHistorial, onActualizar }: HistorialAccesosProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-100" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Historial de Accesos Hoy</h2>
              <p className="text-sm text-slate-400">Últimos 20 registros</p>
            </div>
          </div>
          <button
            onClick={onActualizar}
            disabled={loadingHistorial}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loadingHistorial ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="p-6">
        {loadingHistorial ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        ) : historial.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-slate-400">No hay registros hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map((registro) => (
              <div
                key={registro.id}
                className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      registro.tipo === 'ingreso' 
                        ? 'bg-green-600' 
                        : 'bg-blue-600'
                    }`}>
                      {registro.tipo === 'ingreso' ? (
                        <ArrowRightIcon className="h-5 w-5 text-white transform rotate-90" />
                      ) : (
                        <ArrowRightIcon className="h-5 w-5 text-white transform -rotate-90" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{registro.numero_viaje}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          registro.tipo === 'ingreso' 
                            ? 'bg-green-600 text-green-100' 
                            : 'bg-blue-600 text-blue-100'
                        }`}>
                          {registro.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">
                        {registro.chofer_nombre} • {registro.camion_patente}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm">
                      {new Date(registro.timestamp).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {new Date(registro.timestamp).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

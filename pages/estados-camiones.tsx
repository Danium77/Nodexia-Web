// pages/estados-camiones.tsx
// Panel de estados generales de todos los camiones
// Lógica de datos extraída a lib/hooks/useEstadosCamiones.ts

import { TruckIcon, ClockIcon, CheckCircleIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useEstadosCamiones, {
  mapearEstadoUI,
  getEstadoColor,
  getEstadoTexto,
  type TabEstado,
} from '@/lib/hooks/useEstadosCamiones';

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'confirmado': return <ClockIcon className="h-5 w-5" />;
    case 'ingresado_planta': return <TruckIcon className="h-5 w-5" />;
    case 'llamado_carga':
    case 'cargando': return <ExclamationTriangleIcon className="h-5 w-5" />;
    case 'cargado': return <CheckCircleIcon className="h-5 w-5" />;
    case 'egreso': return <ArrowRightOnRectangleIcon className="h-5 w-5" />;
    case 'en_transito_destino': return <TruckIcon className="h-5 w-5" />;
    case 'ingresado_destino': return <CheckCircleIcon className="h-5 w-5" />;
    case 'descargando': return <ExclamationTriangleIcon className="h-5 w-5" />;
    case 'egreso_destino': return <ArrowRightOnRectangleIcon className="h-5 w-5" />;
    default: return <TruckIcon className="h-5 w-5" />;
  }
};

export default function EstadosCamiones() {
  const {
    viajes,
    viajesPlanta,
    viajesFiltrados,
    loading,
    tabActivo,
    setTabActivo,
    cargarViajes,
    esControlAcceso,
    caCount,
  } = useEstadosCamiones();

  if (loading) {
    return (
      <MainLayout pageTitle="Estados de Camiones">
        <LoadingSpinner text="Cargando viajes..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Estados de Camiones">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <TruckIcon className="h-8 w-8 text-indigo-100" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Monitor General de Vehículos</h1>
            <p className="text-slate-300 mt-1">Estados en tiempo real de todos los camiones en planta</p>
          </div>
        </div>
      </div>

      {/* Resumen de Estados — badges unificados */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        {[
          { key: 'todos' as TabEstado, label: 'Todos', count: esControlAcceso ? viajesPlanta.length : viajes.length, color: 'cyan', Icon: TruckIcon },
          { key: 'ca_en_planta' as TabEstado, label: 'En Planta', count: caCount.enPlanta, color: 'green', Icon: TruckIcon },
          { key: 'ca_por_arribar' as TabEstado, label: 'Por Arribar', count: caCount.porArribar, color: 'blue', Icon: ClockIcon },
          { key: 'ca_cargando' as TabEstado, label: 'Cargando', count: caCount.cargando, color: 'orange', Icon: ExclamationTriangleIcon },
          { key: 'ca_descargando' as TabEstado, label: 'Descargando', count: caCount.descargando, color: 'amber', Icon: ExclamationTriangleIcon },
          { key: 'ca_egresados' as TabEstado, label: 'Egresados', count: caCount.egresados, color: 'gray', Icon: ArrowRightOnRectangleIcon },
        ].map(({ key, label, count, color, Icon }) => (
          <div
            key={key}
            onClick={() => setTabActivo(key)}
            className={`cursor-pointer rounded-lg shadow-sm border p-4 transition-all ${
              tabActivo === key
                ? `bg-${color}-700 border-${color}-500 ring-2 ring-${color}-400`
                : `bg-slate-800 border-slate-700 hover:border-${color}-600`
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-${color}-400`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-300`}>{count}</p>
              </div>
              <Icon className={`h-8 w-8 text-${color}-500`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-100">
                {tabActivo === 'todos' ? 'Todos los Vehículos' : `Vehículos - ${
                  tabActivo.startsWith('ca_')
                    ? { ca_en_planta: 'En Planta', ca_por_arribar: 'Por Arribar', ca_cargando: 'Cargando', ca_descargando: 'Descargando', ca_egresados: 'Egresados' }[tabActivo] || tabActivo
                    : getEstadoTexto(tabActivo)
                }`}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {viajesFiltrados.length} {viajesFiltrados.length === 1 ? 'vehículo' : 'vehículos'}
              </p>
            </div>
            <button onClick={cargarViajes} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
              🔄 Actualizar
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {viajesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No hay vehículos en este estado</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Viaje</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Chofer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Vehículo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Ruta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {viajesFiltrados.map((viaje) => {
                  const estadoUI = mapearEstadoUI(viaje.estado_unidad);
                  // En tab Egresados: mostrar "Egresado" en vez del estado real del viaje
                  const esTabEgresados = tabActivo === 'ca_egresados';
                  return (
                    <tr key={viaje.id} className="hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {esTabEgresados ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-900/30">
                            <span className="mr-1.5"><ArrowRightOnRectangleIcon className="h-5 w-5" /></span>
                            Egresado
                          </div>
                        ) : (
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(estadoUI)}`}>
                            <span className="mr-1.5">{getEstadoIcon(estadoUI)}</span>
                            {getEstadoTexto(estadoUI)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-100">#{viaje.numero_viaje}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">
                          {viaje.chofer_nombre && viaje.chofer_apellido ? `${viaje.chofer_nombre} ${viaje.chofer_apellido}` : 'Sin asignar'}
                        </div>
                        {viaje.chofer_dni && <div className="text-sm text-slate-400">DNI: {viaje.chofer_dni}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">{viaje.camion_patente || 'Sin asignar'}</div>
                        {viaje.camion_marca && <div className="text-sm text-slate-400">{viaje.camion_marca} {viaje.camion_modelo || ''}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">
                          {viaje.origen && viaje.destino ? `${viaje.origen} → ${viaje.destino}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">
                          {viaje.created_at ? new Date(viaje.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

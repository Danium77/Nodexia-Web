// components/Transporte/TripDetailsCard.tsx
// Card showing trip origin, destination, date and vehicle info

import { MapPinIcon, ClockIcon, TruckIcon } from '@heroicons/react/24/outline';

interface TripDetailsCardProps {
  viajeActivo: any;
}

export default function TripDetailsCard({ viajeActivo }: TripDetailsCardProps) {
  const despacho = viajeActivo.despachos;

  const handleNavigate = (type: 'origen' | 'destino') => {
    const lat = type === 'origen' ? despacho.origen_latitud : despacho.destino_latitud;
    const lon = type === 'origen' ? despacho.origen_longitud : despacho.destino_longitud;
    const name = type === 'origen' ? despacho.origen : despacho.destino;
    const city = type === 'origen' ? despacho.origen_ciudad : despacho.destino_ciudad;
    const prov = type === 'origen' ? despacho.origen_provincia : despacho.destino_provincia;

    let url: string;
    if (lat && lon) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    } else {
      const query = encodeURIComponent(`${name}, ${city || ''} ${prov || ''} Argentina`);
      url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      <h3 className="text-lg font-bold text-white mb-3">Detalles del Viaje</h3>
      
      {/* Origen */}
      <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <MapPinIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-green-400 font-semibold mb-1">ORIGEN</p>
            <p className="text-white font-bold text-lg">{despacho.origen}</p>
            {(despacho.origen_ciudad || despacho.origen_provincia) && (
              <p className="text-slate-300 text-sm mt-1">
                📍 {despacho.origen_ciudad}
                {despacho.origen_ciudad && despacho.origen_provincia && ', '}
                {despacho.origen_provincia}
              </p>
            )}
            <button
              onClick={() => handleNavigate('origen')}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
            >
              <MapPinIcon className="h-4 w-4" />
              <span>Navegar al Origen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Línea conectora */}
      <div className="ml-5 border-l-2 border-dashed border-slate-600 h-6"></div>

      {/* Destino */}
      <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <MapPinIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-red-400 font-semibold mb-1">DESTINO</p>
            <p className="text-white font-bold text-lg">{despacho.destino}</p>
            {(despacho.destino_ciudad || despacho.destino_provincia) && (
              <p className="text-slate-300 text-sm mt-1">
                📍 {despacho.destino_ciudad}
                {despacho.destino_ciudad && despacho.destino_provincia && ', '}
                {despacho.destino_provincia}
              </p>
            )}
            <button
              onClick={() => handleNavigate('destino')}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
            >
              <MapPinIcon className="h-4 w-4" />
              <span>Navegar al Destino</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fecha y hora */}
      <div className="flex items-center space-x-3 pt-3 border-t border-slate-700">
        <ClockIcon className="h-5 w-5 text-cyan-400" />
        <div>
          <p className="text-xs text-slate-400">Fecha programada</p>
          <p className="text-white font-medium">
            {new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')} - {despacho.scheduled_local_time}
          </p>
        </div>
      </div>

      {/* Vehículo */}
      {viajeActivo.camiones && (
        <div className="flex items-center space-x-3 pt-3 border-t border-slate-700">
          <TruckIcon className="h-5 w-5 text-cyan-400" />
          <div>
            <p className="text-xs text-slate-400">Vehículo asignado</p>
            <p className="text-white font-medium">
              {viajeActivo.camiones.marca} {viajeActivo.camiones.modelo} - {viajeActivo.camiones.patente}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

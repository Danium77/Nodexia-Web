import React from 'react';

const mockPins = [
  { id: 'p1', lat: -34.6037, lng: -58.3816, label: 'CABA - Cliente A' },
  { id: 'p2', lat: -34.5997, lng: -58.3812, label: 'CABA - Cliente B' },
  { id: 'p3', lat: -34.61, lng: -58.38, label: 'La Plata - Cliente C' },
];

const MapaDespachos: React.FC = () => {
  return (
    <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-lg h-80">
      <div className="text-slate-200 font-semibold mb-2">Mapa simplificado</div>
      <div className="w-full h-[calc(100%-40px)] bg-gradient-to-br from-slate-900 to-slate-800 rounded-md relative">
        {/* Mock pins */}
        {mockPins.map((p, idx) => (
          <div key={p.id} className={`absolute text-xs text-white`} style={{ left: `${10 + idx * 20}%`, top: `${20 + idx * 15}%` }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow" />
              <div className="whitespace-nowrap truncate max-w-[140px]">{p.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* TODO: replace mock with real map (Leaflet/Mapbox) and geocoding on integration */}
    </div>
  );
};

export default MapaDespachos;

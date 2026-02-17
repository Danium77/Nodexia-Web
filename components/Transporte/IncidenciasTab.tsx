import React from 'react';
import { ExclamationTriangleIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface IncidenciasTabProps {
  onLlamarCoordinador: () => void;
  onReportarIncidenciaTipo: (tipo: string, nombre: string) => void;
}

const IncidenciasTab: React.FC<IncidenciasTabProps> = ({ onLlamarCoordinador, onReportarIncidenciaTipo }) => {
  return (
    <div className="p-4 space-y-6">
      {/* Header con ícono animado */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-full border border-slate-700">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Reportar Incidencia</h3>
        <p className="text-slate-400">¿Tienes algún problema durante el viaje?</p>
      </div>

      {/* Botones de incidencias en grid */}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={onLlamarCoordinador}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
          <span className="text-3xl relative z-10">🚨</span>
          <span className="relative z-10">Emergencia</span>
        </button>

        <button
          onClick={() => onReportarIncidenciaTipo('problema_mecanico', 'Avería del Vehículo')}
          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
          <span className="text-3xl relative z-10">⚠️</span>
          <span className="relative z-10">Avería del Vehículo</span>
        </button>

        <button
          onClick={() => onReportarIncidenciaTipo('demora', 'Retraso')}
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
          <span className="text-3xl relative z-10">⏰</span>
          <span className="relative z-10">Retraso</span>
        </button>

        <button
          onClick={() => onReportarIncidenciaTipo('otro', 'Otro problema')}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
          <span className="text-3xl relative z-10">📝</span>
          <span className="relative z-10">Otro</span>
        </button>
      </div>

      {/* Separador visual */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        <span className="text-slate-500 text-sm font-medium">o</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
      </div>

      {/* Botón de llamada destacado */}
      <button
        onClick={onLlamarCoordinador}
        className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-6 rounded-xl font-bold text-xl shadow-xl shadow-green-500/40 hover:shadow-2xl hover:shadow-green-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
        <PhoneIcon className="h-7 w-7 relative z-10 animate-pulse" />
        <span className="relative z-10">Llamar a Coordinador</span>
      </button>
    </div>
  );
};

export default IncidenciasTab;

import React from 'react';
import { TruckIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export type ChoferTab = 'viajes' | 'incidencias' | 'perfil';

interface BottomNavBarProps {
  activeTab: ChoferTab;
  onTabChange: (tab: ChoferTab) => void;
  viajesCount: number;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange, viajesCount }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 shadow-2xl z-50">
      <div className="grid grid-cols-3 h-20 relative">
        {/* Indicador de tab activo animado */}
        <div
          className={`absolute top-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out ${
            activeTab === 'viajes' ? 'left-0 w-1/3' :
            activeTab === 'incidencias' ? 'left-1/3 w-1/3' :
            'left-2/3 w-1/3'
          }`}
        />
        
        {/* Tab Viajes */}
        <button
          onClick={() => onTabChange('viajes')}
          className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
            activeTab === 'viajes'
              ? 'text-cyan-400 scale-105'
              : 'text-slate-400 hover:text-slate-300 hover:scale-105'
          }`}
        >
          <div className={`p-2 rounded-xl transition-all ${
            activeTab === 'viajes' 
              ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
              : 'group-hover:bg-slate-700/30'
          }`}>
            <TruckIcon className={`h-6 w-6 ${activeTab === 'viajes' ? 'animate-pulse' : ''}`} />
          </div>
          <span className={`text-xs font-semibold ${activeTab === 'viajes' ? 'text-cyan-400' : 'text-slate-400'}`}>
            Viajes
          </span>
          {viajesCount > 0 && (
            <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
              {viajesCount}
            </span>
          )}
        </button>

        {/* Tab Incidencias */}
        <button
          onClick={() => onTabChange('incidencias')}
          className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
            activeTab === 'incidencias'
              ? 'text-cyan-400 scale-105'
              : 'text-slate-400 hover:text-slate-300 hover:scale-105'
          }`}
        >
          <div className={`p-2 rounded-xl transition-all ${
            activeTab === 'incidencias' 
              ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
              : 'group-hover:bg-slate-700/30'
          }`}>
            <BellIcon className={`h-6 w-6 ${activeTab === 'incidencias' ? 'animate-pulse' : ''}`} />
          </div>
          <span className={`text-xs font-semibold ${activeTab === 'incidencias' ? 'text-cyan-400' : 'text-slate-400'}`}>
            Incidencias
          </span>
        </button>

        {/* Tab Perfil */}
        <button
          onClick={() => onTabChange('perfil')}
          className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
            activeTab === 'perfil'
              ? 'text-cyan-400 scale-105'
              : 'text-slate-400 hover:text-slate-300 hover:scale-105'
          }`}
        >
          <div className={`p-2 rounded-xl transition-all ${
            activeTab === 'perfil' 
              ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
              : 'group-hover:bg-slate-700/30'
          }`}>
            <UserCircleIcon className={`h-6 w-6 ${activeTab === 'perfil' ? 'animate-pulse' : ''}`} />
          </div>
          <span className={`text-xs font-semibold ${activeTab === 'perfil' ? 'text-cyan-400' : 'text-slate-400'}`}>
            Perfil
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavBar;

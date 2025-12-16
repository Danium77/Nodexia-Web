// components/Planning/ViewSelector.tsx
import React from 'react';
import { CalendarIcon, CalendarDaysIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export type ViewType = 'day' | 'week' | 'month';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex gap-1 bg-[#0a0e1a] rounded p-0.5">
      <button
        onClick={() => onViewChange('day')}
        className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded font-medium transition-all ${
          currentView === 'day'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <CalendarIcon className="h-3 w-3" />
        <span className="hidden sm:inline">Día</span>
      </button>
      
      <button
        onClick={() => onViewChange('week')}
        className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded font-medium transition-all ${
          currentView === 'week'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <CalendarDaysIcon className="h-3 w-3" />
        <span className="hidden sm:inline">Semana</span>
      </button>
      
      <button
        onClick={() => onViewChange('month')}
        className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded font-medium transition-all ${
          currentView === 'month'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Squares2X2Icon className="h-3 w-3" />
        <span className="hidden sm:inline">Mes</span>
      </button>
    </div>
  );
};

export default ViewSelector;

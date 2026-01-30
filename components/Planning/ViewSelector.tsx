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
    <div className="flex gap-1.5 bg-[#0a0e1a] rounded-lg p-1">
      <button
        onClick={() => onViewChange('day')}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
          currentView === 'day'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Día</span>
      </button>
      
      <button
        onClick={() => onViewChange('week')}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
          currentView === 'week'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <CalendarDaysIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Semana</span>
      </button>
      
      <button
        onClick={() => onViewChange('month')}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
          currentView === 'month'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Squares2X2Icon className="h-4 w-4" />
        <span className="hidden sm:inline">Mes</span>
      </button>
    </div>
  );
};

export default ViewSelector;

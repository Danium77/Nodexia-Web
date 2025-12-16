// components/Planning/PlanningFilters.tsx
import React, { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface FilterState {
  searchText: string;
  estado: string;
  prioridad: string;
  transporte: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface PlanningFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  transportes: Array<{ id: string; nombre: string }>;
  totalResults: number;
}

const PlanningFilters: React.FC<PlanningFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  transportes,
  totalResults
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (field: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const hasActiveFilters = 
    filters.searchText || 
    filters.estado || 
    filters.prioridad || 
    filters.transporte ||
    filters.fechaDesde ||
    filters.fechaHasta;

  return (
    <div className="bg-[#1b273b] rounded shadow-lg p-1.5 mb-2">
      {/* Header con búsqueda rápida */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Buscador */}
        <div className="flex-1 min-w-[250px] relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-3 w-3 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por pedido ID, origen, destino..."
            value={filters.searchText}
            onChange={(e) => handleInputChange('searchText', e.target.value)}
            autoComplete="off"
            className="block w-full pl-8 pr-2 py-1 text-[10px] border border-gray-600 rounded bg-[#0a0e1a] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          {filters.searchText && (
            <button
              onClick={() => handleInputChange('searchText', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Botón expandir filtros */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-2 py-1 text-[10px] rounded font-medium transition-all flex items-center gap-1 ${
            hasActiveFilters
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <FunnelIcon className="h-5 w-5" />
          Filtros
          {hasActiveFilters && (
            <span className="bg-white text-cyan-600 rounded-full px-2 py-0.5 text-xs font-bold">
              ●
            </span>
          )}
        </button>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <XMarkIcon className="h-5 w-5" />
            Limpiar
          </button>
        )}

        {/* Contador de resultados */}
        <div className="text-gray-400 text-sm">
          <span className="font-semibold text-cyan-400">{totalResults}</span> resultado{totalResults !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-[#0a0e1a] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="generado">Generado</option>
              <option value="asignado">Asignado</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_camino">En Camino</option>
              <option value="cargando">Cargando</option>
              <option value="despachado">Despachado</option>
              <option value="terminado">Terminado</option>
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Prioridad</label>
            <select
              value={filters.prioridad}
              onChange={(e) => handleInputChange('prioridad', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-[#0a0e1a] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Todas</option>
              <option value="Urgente">Urgente</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

          {/* Transporte */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Transporte</label>
            <select
              value={filters.transporte}
              onChange={(e) => handleInputChange('transporte', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-[#0a0e1a] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Todos</option>
              <option value="_sin_asignar">Sin asignar</option>
              {transportes.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Desde</label>
            <input
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => handleInputChange('fechaDesde', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-[#0a0e1a] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => handleInputChange('fechaHasta', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-[#0a0e1a] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningFilters;

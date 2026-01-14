import React from 'react';
import UbicacionAutocompleteInput from '../forms/UbicacionAutocompleteInput';

export interface FormDispatchRow {
  tempId: number;
  pedido_id: string;
  origen: string;
  origen_id?: string;
  destino: string;
  destino_id?: string;
  fecha_despacho: string;
  hora_despacho: string;
  tipo_carga: string;
  prioridad: string;
  cantidad_viajes_solicitados: number;
  unidad_type: string;
  observaciones: string;
}

interface DespachoFormRowProps {
  row: FormDispatchRow;
  index: number;
  loading: boolean;
  onSave: (row: FormDispatchRow, index: number) => void;
  onChange: (tempId: number, field: keyof FormDispatchRow, value: any) => void;
  onUpdateRow: (updater: (prevRows: FormDispatchRow[]) => FormDispatchRow[]) => void;
}

export const DespachoFormRow: React.FC<DespachoFormRowProps> = ({
  row,
  index,
  loading,
  onSave,
  onChange,
  onUpdateRow
}) => {
  return (
    <div key={row.tempId} className="bg-[#0e1a2d] rounded p-2 border border-gray-700">
      {/* Header: Número y Código */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 font-bold text-lg">#{index + 1}</span>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Código de Despacho</label>
            <input
              type="text"
              value={row.pedido_id}
              readOnly
              autoComplete="off"
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed w-40"
              placeholder="Auto-generado"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSave(row, index)}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-60 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Fila 1: Origen, Destino, Tipo Carga */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Origen */}
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Origen <span className="text-red-400">*</span>
          </label>
          <UbicacionAutocompleteInput
            tipo="origen"
            value={row.origen}
            onSelect={(ubicacion) => {
              onChange(row.tempId, 'origen', ubicacion.alias || ubicacion.nombre);
              onUpdateRow(prevRows =>
                prevRows.map(r =>
                  r.tempId === row.tempId
                    ? { ...r, origen_id: ubicacion.id }
                    : r
                )
              );
            }}
            placeholder="Buscar origen..."
            required
          />
        </div>

        {/* Destino */}
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Destino <span className="text-red-400">*</span>
          </label>
          <UbicacionAutocompleteInput
            tipo="destino"
            value={row.destino}
            onSelect={(ubicacion) => {
              onChange(row.tempId, 'destino', ubicacion.alias || ubicacion.nombre);
              onUpdateRow(prevRows =>
                prevRows.map(r =>
                  r.tempId === row.tempId
                    ? { ...r, destino_id: ubicacion.id }
                    : r
                )
              );
            }}
            placeholder="Buscar destino..."
            required
          />
        </div>

        {/* Tipo de Carga */}
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Tipo de Carga <span className="text-red-400">*</span>
          </label>
          <select
            value={row.tipo_carga}
            onChange={(e) => onChange(row.tempId, 'tipo_carga', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          >
            <option value="">Seleccionar...</option>
            <option value="General">General</option>
            <option value="Frágil">Frágil</option>
            <option value="Perecedera">Perecedera</option>
            <option value="Peligrosa">Peligrosa</option>
            <option value="Sobredimensionada">Sobredimensionada</option>
          </select>
        </div>
      </div>

      {/* Fila 2: Fecha, Hora, Prioridad, Cantidad Viajes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Fecha <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={row.fecha_despacho}
            onChange={(e) => onChange(row.tempId, 'fecha_despacho', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Hora <span className="text-red-400">*</span>
          </label>
          <input
            type="time"
            value={row.hora_despacho}
            onChange={(e) => onChange(row.tempId, 'hora_despacho', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Prioridad
          </label>
          <select
            value={row.prioridad}
            onChange={(e) => onChange(row.tempId, 'prioridad', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Cantidad de Viajes
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={row.cantidad_viajes_solicitados}
            onChange={(e) => onChange(row.tempId, 'cantidad_viajes_solicitados', parseInt(e.target.value) || 1)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
      </div>

      {/* Fila 3: Unidad Type, Observaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Unidad Type
          </label>
          <select
            value={row.unidad_type}
            onChange={(e) => onChange(row.tempId, 'unidad_type', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="">Seleccionar...</option>
            <option value="Pallet">Pallet</option>
            <option value="Caja">Caja</option>
            <option value="Bulto">Bulto</option>
            <option value="Contenedor">Contenedor</option>
            <option value="Granel">Granel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">
            Observaciones
          </label>
          <textarea
            value={row.observaciones}
            onChange={(e) => onChange(row.tempId, 'observaciones', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white resize-none"
            rows={2}
            placeholder="Notas adicionales..."
          />
        </div>
      </div>
    </div>
  );
};

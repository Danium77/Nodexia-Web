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
  referencia_cliente: string;
}

interface DespachoFormProps {
  formRows: FormDispatchRow[];
  onRowChange: (tempId: number, field: keyof FormDispatchRow, value: string | number) => void;
  onSaveRow: (row: FormDispatchRow, index: number) => void;
  onFormRowsChange: React.Dispatch<React.SetStateAction<FormDispatchRow[]>>;
  loading: boolean;
  today: string;
}

const DespachoForm: React.FC<DespachoFormProps> = ({
  formRows,
  onRowChange,
  onSaveRow,
  onFormRowsChange,
  loading,
  today,
}) => {
  return (
    <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
      <div className="w-full overflow-x-auto bg-[#1b273b] p-2 rounded shadow-lg mb-2">
        <div className="space-y-4">
          {formRows.map((row, index) => (
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
                      onRowChange(row.tempId, 'origen', ubicacion.alias || ubicacion.nombre);
                      onFormRowsChange(prevRows =>
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
                      onRowChange(row.tempId, 'destino', ubicacion.alias || ubicacion.nombre);
                      onFormRowsChange(prevRows =>
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

                {/* Tipo Carga */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Tipo de Carga</label>
                  <select
                    value={row.tipo_carga}
                    onChange={(e) => onRowChange(row.tempId, 'tipo_carga', e.target.value)}
                    autoComplete="off"
                    name={`tipo_carga-${row.tempId}`}
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="paletizada">Paletizada</option>
                    <option value="granel">Granel</option>
                    <option value="contenedor">Contenedor</option>
                  </select>
                </div>
              </div>

              {/* Fila 2: Fecha, Hora, Prioridad, Cant. Viajes, Tipo Unidad, Observaciones */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {/* Fecha */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={row.fecha_despacho}
                    onChange={(e) => onRowChange(row.tempId, 'fecha_despacho', e.target.value)}
                    min={today}
                    autoComplete="off"
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Hora */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Hora</label>
                  <input
                    type="time"
                    value={row.hora_despacho}
                    onChange={(e) => onRowChange(row.tempId, 'hora_despacho', e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Prioridad</label>
                  <select
                    value={row.prioridad === 'Medios de comunicación' ? 'Media' : (row.prioridad === 'Medios' ? 'Media' : (row.prioridad || 'Media'))}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (['Baja', 'Media', 'Alta', 'Urgente'].includes(value)) {
                        onRowChange(row.tempId, 'prioridad', value);
                      }
                    }}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    name={`priority_field_${Math.random()}`}
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                {/* Cantidad de Viajes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">
                    Cant. Viajes 🚛
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={row.cantidad_viajes_solicitados || 1}
                    onChange={(e) => onRowChange(row.tempId, 'cantidad_viajes_solicitados', parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    title="Cantidad de camiones/viajes necesarios para este despacho"
                  />
                </div>

                {/* Tipo Unidad */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Tipo Unidad</label>
                  <select
                    value={row.unidad_type}
                    onChange={(e) => onRowChange(row.tempId, 'unidad_type', e.target.value)}
                    autoComplete="off"
                    name={`unidad_type-${row.tempId}`}
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="chasis">Chasis</option>
                    <option value="semi">Semi</option>
                    <option value="batea">Batea</option>
                    <option value="furgon">Furgón</option>
                  </select>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Observaciones</label>
                  <input
                    type="text"
                    value={row.observaciones}
                    onChange={(e) => onRowChange(row.tempId, 'observaciones', e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              {/* Fila 3: Referencia Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1.5">Ref. Cliente (NP/OC)</label>
                  <input
                    type="text"
                    value={row.referencia_cliente || ''}
                    onChange={(e) => onRowChange(row.tempId, 'referencia_cliente', e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Ej: NP-2026-0845, OC-12345"
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => onSaveRow(row, index)}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:opacity-60 transition-colors shadow-lg"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};

export default DespachoForm;

// components/SuperAdmin/ViajeAcciones.tsx
// Action buttons for viaje cards in supervisor-carga page
// Shows different buttons based on current viaje estado

import { ChangeEvent, RefObject } from 'react';
import {
  CheckCircleIcon,
  PhoneIcon,
  PlayIcon,
  CameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DocStatus {
  total: number;
  vigentes: number;
  vencidos: number;
  pendientes: number;
}

export interface ViajeParaCarga {
  id: string;
  numero_viaje: string;
  estado: string;
  estado_carga: string;
  origen: string;
  destino: string;
  chofer: { nombre: string; dni: string };
  camion: { patente: string; marca: string };
  acoplado: { patente: string; marca: string } | null;
  tipo_operacion: 'carga' | 'descarga';
  docs_chofer: DocStatus;
  docs_camion: DocStatus;
  docs_acoplado: DocStatus | null;
}

interface ViajeAccionesProps {
  viaje: ViajeParaCarga;
  loadingAction: string | null;
  remitoPreview: string | null;
  remitoFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadingRemito: boolean;
  onLlamarACarga: (id: string) => void;
  onIniciarCarga: (v: ViajeParaCarga) => void;
  onFinalizarCarga: (id: string) => void;
  onLlamarADescarga: (id: string) => void;
  onIniciarDescarga: (v: ViajeParaCarga) => void;
  onFinalizarDescarga: (id: string) => void;
  onRemitoFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onLimpiarRemito: () => void;
}

export default function ViajeAcciones({
  viaje: v,
  loadingAction,
  remitoPreview,
  remitoFile,
  fileInputRef,
  uploadingRemito,
  onLlamarACarga,
  onIniciarCarga,
  onFinalizarCarga,
  onLlamarADescarga,
  onIniciarDescarga,
  onFinalizarDescarga,
  onRemitoFileChange,
  onLimpiarRemito,
}: ViajeAccionesProps) {
  const isLoading = loadingAction === v.id;

  // === CARGA (origen) ===
  if (v.estado === 'cargado') {
    return (
      <span className="text-sm text-green-400 flex items-center gap-1.5">
        <CheckCircleIcon className="h-4 w-4" />
        Cargado - Esperando egreso (Control Acceso)
      </span>
    );
  }

  if (v.estado === 'ingresado_origen') {
    return (
      <button
        onClick={() => onLlamarACarga(v.id)}
        disabled={isLoading}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        <PhoneIcon className="h-4 w-4" />
        {isLoading ? 'Llamando...' : '📢 Llamar a Carga'}
      </button>
    );
  }

  if (v.estado === 'llamado_carga') {
    return (
      <button
        onClick={() => onIniciarCarga(v)}
        disabled={isLoading}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        <PlayIcon className="h-4 w-4" />
        {isLoading ? 'Iniciando...' : '⚙️ Iniciar Carga'}
      </button>
    );
  }

  if (v.estado === 'cargando') {
    return (
      <div className="w-full space-y-3">
        {/* Foto del remito */}
        <div className="border border-dashed border-slate-600 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-2 font-medium">📸 Foto del remito firmado (requerida)</p>

          {!remitoPreview ? (
            <label className="flex flex-col items-center gap-2 cursor-pointer py-4 hover:bg-slate-700/30 rounded-lg transition-colors">
              <CameraIcon className="h-8 w-8 text-yellow-500" />
              <span className="text-sm text-slate-300">Tomar foto o seleccionar imagen</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onRemitoFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={remitoPreview}
                alt="Remito firmado"
                className="w-full max-h-48 object-contain rounded-lg bg-slate-900"
              />
              <button
                onClick={onLimpiarRemito}
                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                title="Quitar foto"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              {remitoFile && (
                <p className="text-xs text-slate-500 mt-1 text-center">
                  {remitoFile.name} ({(remitoFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botón Finalizar Carga — solo habilitado con foto */}
        <button
          onClick={() => onFinalizarCarga(v.id)}
          disabled={isLoading || !remitoFile || uploadingRemito}
          className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="h-4 w-4" />
          {uploadingRemito ? 'Subiendo foto...' : isLoading ? 'Finalizando...' : !remitoFile ? '📷 Suba la foto para finalizar' : '✅ Finalizar Carga'}
        </button>
      </div>
    );
  }

  // === DESCARGA (destino) ===
  if (v.estado === 'descargado') {
    return (
      <span className="text-sm text-green-400 flex items-center gap-1.5">
        <CheckCircleIcon className="h-4 w-4" />
        Descargado - Esperando egreso (Control Acceso)
      </span>
    );
  }

  if (v.estado === 'ingresado_destino') {
    return (
      <button
        onClick={() => onLlamarADescarga(v.id)}
        disabled={isLoading}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        <PhoneIcon className="h-4 w-4" />
        {isLoading ? 'Llamando...' : '📢 Llamar a Descarga'}
      </button>
    );
  }

  if (v.estado === 'llamado_descarga') {
    return (
      <button
        onClick={() => onIniciarDescarga(v)}
        disabled={isLoading}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        <PlayIcon className="h-4 w-4" />
        {isLoading ? 'Iniciando...' : '⬇️ Iniciar Descarga'}
      </button>
    );
  }

  if (v.estado === 'descargando') {
    return (
      <button
        onClick={() => onFinalizarDescarga(v.id)}
        disabled={isLoading}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-500 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        <CheckCircleIcon className="h-4 w-4" />
        {isLoading ? 'Finalizando...' : '✅ Finalizar Descarga'}
      </button>
    );
  }

  return null;
}

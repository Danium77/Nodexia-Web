// components/Admin/DocumentoPendienteCard.tsx
// Card individual para documento pendiente de validación (TASK-S04)

import { useState } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  BuildingOfficeIcon,
  TruckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export interface DocumentoPendiente {
  id: string;
  tipo_documento: string;
  nombre_archivo: string;
  entidad_tipo: 'chofer' | 'camion' | 'acoplado' | 'transporte';
  entidad_id: string;
  empresa_id: string;
  created_at: string;
  file_url: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  entidad_info: {
    nombre?: string;
    patente?: string;
    dni?: string;
  };
  empresa_nombre?: string;
}

interface DocumentoPendienteCardProps {
  documento: DocumentoPendiente;
  onAprobar: (id: string) => void;
  onRechazar: (id: string, motivo: string) => void;
}

export default function DocumentoPendienteCard({
  documento,
  onAprobar,
  onRechazar,
}: DocumentoPendienteCardProps) {
  const [showRechazoInput, setShowRechazoInput] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const formatTipoDocumento = (tipo: string): string => {
    const nombres: Record<string, string> = {
      licencia_conducir: 'Licencia de Conducir',
      art_clausula_no_repeticion: 'ART Cláusula No Repetición',
      seguro_vida_autonomo: 'Seguro de Vida Autónomo',
      seguro: 'Seguro',
      rto: 'Revisión Técnica Obligatoria',
      cedula: 'Cédula Verde',
      seguro_carga_global: 'Seguro de Carga Global',
      habilitacion: 'Habilitación',
      vtv: 'VTV',
      seguro_rc: 'Seguro RC',
    };
    return nombres[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getEntidadIcon = () => {
    switch (documento.entidad_tipo) {
      case 'chofer':
        return <UserIcon className="h-5 w-5 text-blue-400" />;
      case 'camion':
        return <TruckIcon className="h-5 w-5 text-purple-400" />;
      case 'acoplado':
        return <TruckIcon className="h-5 w-5 text-cyan-400" />;
      case 'transporte':
        return <BuildingOfficeIcon className="h-5 w-5 text-orange-400" />;
      default:
        return <BuildingOfficeIcon className="h-5 w-5 text-slate-400" />;
    }
  };

  const getEntidadLabel = (): string => {
    switch (documento.entidad_tipo) {
      case 'chofer':
        return documento.entidad_info.nombre || 'Chofer sin nombre';
      case 'camion':
        return documento.entidad_info.patente || 'Camión sin patente';
      case 'acoplado':
        return documento.entidad_info.patente || 'Acoplado sin patente';
      default:
        return 'Entidad desconocida';
    }
  };

  const getEntidadTipoLabel = (): string => {
    switch (documento.entidad_tipo) {
      case 'chofer':
        return 'Chofer';
      case 'camion':
        return 'Camión';
      case 'acoplado':
        return 'Acoplado';
      case 'transporte':
        return 'Transporte';
      default:
        return documento.entidad_tipo;
    }
  };

  const handleAprobar = async () => {
    setProcesando(true);
    try {
      await onAprobar(documento.id);
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) return;
    setProcesando(true);
    try {
      await onRechazar(documento.id, motivoRechazo.trim());
    } finally {
      setProcesando(false);
      setShowRechazoInput(false);
      setMotivoRechazo('');
    }
  };

  const handleVerArchivo = () => {
    if (documento.file_url) {
      window.open(documento.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors bg-slate-700">
      <div className="flex items-start justify-between gap-4">
        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-600 rounded-lg flex-shrink-0">
              <DocumentTextIcon className="h-5 w-5 text-slate-300" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-100 truncate">
                {formatTipoDocumento(documento.tipo_documento)}
              </h4>
              <p className="text-sm text-slate-400 truncate mt-0.5">
                {documento.nombre_archivo}
              </p>

              {/* Info de entidad */}
              <div className="flex items-center gap-2 mt-2">
                {getEntidadIcon()}
                <span className="text-sm text-slate-300">
                  {getEntidadTipoLabel()}: <span className="font-medium text-slate-100">{getEntidadLabel()}</span>
                </span>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                {documento.empresa_nombre && (
                  <span className="flex items-center gap-1">
                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                    {documento.empresa_nombre}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Subido: {new Date(documento.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {documento.fecha_emision && (
                  <span>
                    Emisión: {new Date(documento.fecha_emision).toLocaleDateString('es-AR')}
                  </span>
                )}
                {documento.fecha_vencimiento && (
                  <span>
                    Vence: {new Date(documento.fecha_vencimiento).toLocaleDateString('es-AR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estado badge + ver archivo */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-blue-900 text-blue-300 border-blue-700">
            <ClockIcon className="h-4 w-4" />
            Pendiente
          </span>
          <button
            onClick={handleVerArchivo}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600 rounded transition-colors"
            title="Ver documento"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Acciones de validación */}
      <div className="mt-4 pt-3 border-t border-slate-600">
        {!showRechazoInput ? (
          <div className="flex gap-3">
            <button
              onClick={handleAprobar}
              disabled={procesando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {procesando ? 'Procesando...' : 'Aprobar'}
            </button>
            <button
              onClick={() => setShowRechazoInput(true)}
              disabled={procesando}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <XCircleIcon className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Motivo del rechazo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ingrese el motivo del rechazo..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRechazar}
                disabled={procesando || !motivoRechazo.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <XCircleIcon className="h-4 w-4" />
                {procesando ? 'Procesando...' : 'Confirmar rechazo'}
              </button>
              <button
                onClick={() => {
                  setShowRechazoInput(false);
                  setMotivoRechazo('');
                }}
                disabled={procesando}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// components/Transporte/ChoferModals.tsx
// QR Modal, Hamburger Menu, and Incidencia Modal for chofer-mobile

import { QRCodeSVG } from 'qrcode.react';
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

// ─── QR Modal ────────────────────────────────────────────────────
interface QRModalProps {
  viajeActivo: any;
  onClose: () => void;
}

export function QRModal({ viajeActivo, onClose }: QRModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">QR del Viaje</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-xl mb-4 flex items-center justify-center">
            <QRCodeSVG
              value={JSON.stringify({
                viaje_id: viajeActivo.id,
                pedido_id: viajeActivo.despachos.pedido_id,
                numero_viaje: viajeActivo.numero_viaje,
                tipo: 'acceso_chofer',
                timestamp: new Date().toISOString()
              })}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="space-y-2 text-sm">
            <p className="text-cyan-400 font-bold">{viajeActivo.despachos.pedido_id}</p>
            <p className="text-slate-300">Viaje #{viajeActivo.numero_viaje}</p>
            <p className="text-slate-400 text-xs mt-4">
              Presenta este código en Control de Acceso
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hamburger Menu ──────────────────────────────────────────────
interface HamburgerMenuProps {
  onClose: () => void;
}

export function HamburgerMenu({ onClose }: HamburgerMenuProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Menú</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => { onClose(); /* TODO: Implementar navegación a histórico */ }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all flex items-center space-x-3"
          >
            <ClipboardDocumentListIcon className="h-6 w-6 text-cyan-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold">Histórico de Viajes</p>
              <p className="text-xs text-slate-400">Ver viajes anteriores</p>
            </div>
          </button>

          <button
            onClick={() => { onClose(); /* TODO: Implementar navegación a documentación */ }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all flex items-center space-x-3"
          >
            <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold">Documentación</p>
              <p className="text-xs text-slate-400">Guías y manuales</p>
            </div>
          </button>

          <button
            onClick={() => { onClose(); window.location.href = 'tel:+541121608941'; }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all flex items-center space-x-3"
          >
            <PhoneIcon className="h-6 w-6 text-cyan-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold">Soporte</p>
              <p className="text-xs text-slate-400">Contactar al coordinador</p>
            </div>
          </button>
        </div>

        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Nodexia v1.0.0 - App Chofer
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Incidencia Modal ────────────────────────────────────────────
interface IncidenciaModalProps {
  viajeActivo: any;
  incidenciaTipoNombre: string;
  incidenciaDescripcion: string;
  onDescripcionChange: (value: string) => void;
  reportandoIncidencia: boolean;
  onClose: () => void;
  onEnviar: () => void;
}

export function IncidenciaModal({
  viajeActivo,
  incidenciaTipoNombre,
  incidenciaDescripcion,
  onDescripcionChange,
  reportandoIncidencia,
  onClose,
  onEnviar,
}: IncidenciaModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-red-500/30 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-red-600/20 to-orange-600/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="bg-red-500/20 p-2 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Reportar {incidenciaTipoNombre}</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" disabled={reportandoIncidencia}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-slate-300">
            Describe el problema para que el coordinador pueda ayudarte
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Viaje:</p>
            <p className="text-white font-semibold">{viajeActivo?.despachos.pedido_id} - Viaje #{viajeActivo?.numero_viaje}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción del problema *
            </label>
            <textarea
              value={incidenciaDescripcion}
              onChange={(e) => onDescripcionChange(e.target.value)}
              placeholder={`Describe el ${incidenciaTipoNombre.toLowerCase()} en detalle...`}
              rows={5}
              disabled={reportandoIncidencia}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              {incidenciaDescripcion.length} caracteres
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={reportandoIncidencia}
              className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={onEnviar}
              disabled={reportandoIncidencia || !incidenciaDescripcion.trim()}
              className="py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {reportandoIncidencia ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>Reportar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

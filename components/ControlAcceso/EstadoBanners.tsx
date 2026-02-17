// components/ControlAcceso/EstadoBanners.tsx
// Contextual information banners based on viaje state + Remito preview

import { TruckIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { EstadoUnidadViaje as EstadoUnidadViajeType } from '../../lib/types';

interface EstadoBannersProps {
  estadoUnidad: EstadoUnidadViajeType;
  tipoOperacion: 'envio' | 'recepcion';
  documentacionValidada: boolean;
  remitoUrl: string | null;
  remitoValidado: boolean;
  loadingRemito: boolean;
  onValidarRemito: () => void;
}

export default function EstadoBanners({
  estadoUnidad,
  tipoOperacion,
  documentacionValidada,
  remitoUrl,
  remitoValidado,
  loadingRemito,
  onValidarRemito,
}: EstadoBannersProps) {
  return (
    <>
      {/* Información contextual según estado */}
      {estadoUnidad === 'ingresado_origen' && tipoOperacion === 'envio' && (
        <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-blue-100 font-semibold">El camión ha arribado a planta</p>
              <p className="text-blue-300 text-sm mt-1">Confirme el ingreso para permitir el acceso a la playa de espera</p>
            </div>
          </div>
        </div>
      )}

      {estadoUnidad === 'ingresado_origen' && tipoOperacion === 'envio' && (
        <div className="mb-6 bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-600 rounded-lg">
              <TruckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-yellow-100 font-semibold">Camión en playa de espera</p>
              <p className="text-yellow-300 text-sm mt-1">Asigne una playa específica o espere llamado a carga del coordinador</p>
            </div>
          </div>
        </div>
      )}

      {(estadoUnidad === 'cargado' || estadoUnidad === 'egreso_origen') && tipoOperacion === 'envio' && !documentacionValidada && (
        <div className="mb-6 bg-purple-900/30 border border-purple-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-purple-100 font-semibold">Carga completada - Validar documentación y remito</p>
              <p className="text-purple-300 text-sm mt-1">Verifique el remito firmado y la documentación antes de autorizar la salida</p>
            </div>
          </div>
        </div>
      )}

      {/* Vista previa del Remito firmado — solo para estado cargado en envío */}
      {(estadoUnidad === 'cargado' || estadoUnidad === 'egreso_origen') && tipoOperacion === 'envio' && (
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <h3 className="text-white font-semibold">Remito Firmado</h3>
            </div>
            {remitoValidado && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-700 font-semibold">✅ Validado</span>
            )}
          </div>

          {loadingRemito ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="ml-3 text-slate-400 text-sm">Cargando remito...</span>
            </div>
          ) : remitoUrl ? (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg p-2 border border-slate-700">
                <img
                  src={remitoUrl}
                  alt="Remito firmado"
                  className="w-full max-h-64 object-contain rounded cursor-pointer"
                  onClick={() => window.open(remitoUrl, '_blank')}
                  title="Click para ver en tamaño completo"
                />
              </div>
              <p className="text-xs text-slate-500 text-center">Click en la imagen para ampliar</p>

              {!remitoValidado && (
                <button
                  onClick={onValidarRemito}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Validar Remito
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-900/50 rounded-lg border border-dashed border-slate-700">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No se encontró foto del remito</p>
              <p className="text-slate-500 text-xs mt-1">El supervisor de carga debe subir la foto del remito firmado</p>
            </div>
          )}
        </div>
      )}

      {estadoUnidad === 'en_transito_destino' && tipoOperacion === 'recepcion' && (
        <>
          <div className="mb-6 bg-purple-900/30 border border-purple-700 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <TruckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-purple-100 font-semibold">Camión en tránsito hacia destino</p>
                <p className="text-purple-300 text-sm mt-1">Aguardando arribo para confirmar ingreso</p>
              </div>
            </div>
          </div>

          <div className="mb-6 bg-teal-900/30 border border-teal-700 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-600 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-teal-100 font-semibold">Camión arribó a destino</p>
                <p className="text-teal-300 text-sm mt-1">Confirme el ingreso para registrar la entrada</p>
              </div>
            </div>
          </div>
        </>
      )}

      {estadoUnidad === 'ingresado_destino' && tipoOperacion === 'recepcion' && (
        <div className="mb-6 bg-cyan-900/30 border border-cyan-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-600 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-cyan-100 font-semibold">Camión ingresado en destino</p>
              <p className="text-cyan-300 text-sm mt-1">Llame a descarga cuando esté listo</p>
            </div>
          </div>
        </div>
      )}

      {(estadoUnidad === 'llamado_descarga' || estadoUnidad === 'descargando') && tipoOperacion === 'recepcion' && (
        <div className="mb-6 bg-orange-900/30 border border-orange-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <TruckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-orange-100 font-semibold">{estadoUnidad === 'llamado_descarga' ? 'Descarga solicitada' : 'Descargando'}</p>
              <p className="text-orange-300 text-sm mt-1">Aguardando finalización de descarga</p>
            </div>
          </div>
        </div>
      )}

      {(estadoUnidad === 'descargado' || estadoUnidad === 'egreso_destino') && tipoOperacion === 'recepcion' && (
        <div className="mb-6 bg-green-900/30 border border-green-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-green-100 font-semibold">Descarga completada</p>
              <p className="text-green-300 text-sm mt-1">Confirme el egreso del camión</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

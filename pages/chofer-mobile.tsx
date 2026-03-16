// pages/chofer-mobile.tsx
// Dashboard móvil para choferes - Optimizado para smartphones

import {
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  Bars3Icon,
  QrCodeIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import BottomNavBar from '@/components/Transporte/BottomNavBar';
import IncidenciasTab from '@/components/Transporte/IncidenciasTab';
import PerfilTab from '@/components/Transporte/PerfilTab';
import TripDetailsCard from '@/components/Transporte/TripDetailsCard';
import { QRModal, HamburgerMenu, IncidenciaModal } from '@/components/Transporte/ChoferModals';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useChoferMobile from '@/lib/hooks/useChoferMobile';

export default function ChoferMobilePage() {
  const h = useChoferMobile();

  if (h.loading && h.viajes.length === 0) {
    return <LoadingSpinner text="Cargando viajes..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-2xl sticky top-0 z-10 border-b border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                {h.choferData?.nombre?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  {h.activeTab === 'viajes' && '🚚 Mis Viajes'}
                  {h.activeTab === 'incidencias' && '🚨 Incidencias'}
                  {h.activeTab === 'perfil' && '👤 Mi Perfil'}
                </h1>
                <p className="text-xs text-slate-400">
                  {h.activeTab === 'viajes' && `${h.viajes.length} ${h.viajes.length === 1 ? 'viaje' : 'viajes'}`}
                  {h.activeTab === 'incidencias' && 'Reportar problemas'}
                  {h.activeTab === 'perfil' && `${h.choferData?.nombre} ${h.choferData?.apellido}`}
                </p>
              </div>
            </div>

            {/* Botones de acciones rápidas */}
            <div className="flex items-center space-x-2">
              {h.viajeActivo && (
                <button
                  onClick={() => h.setShowQRModal(true)}
                  className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center shadow-lg transition-all hover:scale-105"
                >
                  <QrCodeIcon className="h-6 w-6 text-white" />
                </button>
              )}
              <div className={`flex items-center space-x-1 px-2 py-1.5 rounded-full ${h.isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                <div className={`w-2 h-2 rounded-full ${h.isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                <span className="text-xs font-semibold sr-only sm:not-sr-only">{h.isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <button
                onClick={() => h.setShowMenuHamburguesa(true)}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                <Bars3Icon className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes con animación */}
      {h.message && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm backdrop-blur-sm shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{h.message}</span>
          </div>
        </div>
      )}

      {h.error && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm backdrop-blur-sm shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{h.error}</span>
          </div>
        </div>
      )}

      {/* Sin viajes */}
      {h.viajes.length === 0 && h.activeTab === 'viajes' && (
        <div className="text-center py-20 px-6">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-full border border-slate-700">
              <TruckIcon className="h-20 w-20 text-slate-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Sin viajes asignados</h2>
          <p className="text-slate-400 max-w-xs mx-auto">
            Cuando el coordinador te asigne un nuevo viaje, recibirás una notificación y aparecerá aquí
          </p>
        </div>
      )}

      {/* Contenido principal del viaje activo */}
      {h.viajeActivo && (
        <div className="p-4 space-y-4">
          {/* Tarjeta de estado actual */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded p-2 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-cyan-100 text-sm font-medium">Estado Actual</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                h.viajeActivo.estado === 'transporte_asignado' || h.viajeActivo.estado === 'camion_asignado' ? 'bg-yellow-600' :
                h.viajeActivo.estado === 'confirmado_chofer' ? 'bg-blue-600' :
                h.viajeActivo.estado === 'en_transito_origen' || h.viajeActivo.estado === 'en_transito_destino' ? 'bg-green-600' :
                h.viajeActivo.estado === 'ingresado_origen' || h.viajeActivo.estado === 'ingresado_destino' ? 'bg-purple-600' :
                h.viajeActivo.estado === 'llamado_carga' || h.viajeActivo.estado === 'cargando' || h.viajeActivo.estado === 'llamado_descarga' || h.viajeActivo.estado === 'descargando' ? 'bg-amber-600' :
                h.viajeActivo.estado === 'cargado' || h.viajeActivo.estado === 'descargado' || h.viajeActivo.estado === 'egreso_origen' || h.viajeActivo.estado === 'egreso_destino' || h.viajeActivo.estado === 'completado' ? 'bg-emerald-600' :
                h.viajeActivo.estado === 'pausado' ? 'bg-orange-600' :
                'bg-slate-600'
              } text-white`}>
                {h.viajeActivo.estado === 'transporte_asignado' ? 'CHOFER ASIGNADO' :
                 h.viajeActivo.estado === 'pausado' ? '⏸️ PAUSADO' :
                 h.viajeActivo.estado.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">
              Viaje #{h.viajeActivo.numero_viaje}
            </h2>
            <p className="text-cyan-100 text-sm">{h.viajeActivo.despachos.pedido_id}</p>
          </div>

          <TripDetailsCard viajeActivo={h.viajeActivo} />

          {/* Acciones según estado */}
          <div className="space-y-3">
            {(h.viajeActivo.estado === 'transporte_asignado' || h.viajeActivo.estado === 'camion_asignado' || h.viajeActivo.estado === 'asignado') && (
              <button
                onClick={h.handleConfirmarViaje}
                disabled={h.loading}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <CheckCircleIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">✓ Confirmar Viaje</span>
              </button>
            )}

            {h.viajeActivo.estado === 'pausado' && (
              <>
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 border border-yellow-500/40 rounded-xl p-4 mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">Viaje Pausado - Incidencia Reportada</span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    El viaje está pausado debido a una incidencia. Cuando estés listo, reinicia el viaje.
                  </p>
                </div>
                <button
                  onClick={h.handleIniciarViaje}
                  disabled={h.loading}
                  className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  <TruckIcon className="h-7 w-7 relative z-10" />
                  <span className="relative z-10">🔄 Reiniciar Viaje</span>
                </button>
              </>
            )}

            {h.viajeActivo.estado === 'confirmado_chofer' && (
              <button
                onClick={h.handleIniciarViaje}
                disabled={h.loading}
                className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <TruckIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">🚚 Iniciar Viaje a Origen</span>
              </button>
            )}

            {h.viajeActivo.estado === 'en_transito_origen' && (
              <>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <p className="text-blue-400 font-bold text-lg">🚛 En tránsito hacia origen</p>
                  </div>
                  <p className="text-sm text-slate-300">GPS activo - Tu ubicación se está compartiendo</p>
                  {h.location && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      📍 {h.location.lat.toFixed(6)}, {h.location.lon.toFixed(6)}
                    </p>
                  )}
                  {h.lastLocationSent && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Última ubicación: {new Date(h.lastLocationSent).toLocaleTimeString('es-AR')}
                    </p>
                  )}
                </div>
                <button
                  onClick={h.handleEnviarUbicacionManual}
                  disabled={h.sendingLocation}
                  className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <MapPinIcon className="h-5 w-5" />
                  <span>{h.sendingLocation ? 'Enviando...' : '📍 Enviar Ubicación Ahora'}</span>
                </button>
                <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-xl p-4 text-center">
                  <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Esperando registro en porteria</p>
                  <p className="text-slate-400 text-xs">Control de Acceso registrará tu llegada al escanear el QR</p>
                </div>
              </>
            )}

            {h.viajeActivo.estado === 'ingresado_origen' && (
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🏭</span>
                </div>
                <p className="text-blue-400 font-bold text-lg mb-2">Ingreso registrado</p>
                <p className="text-sm text-slate-300">Esperando llamado a carga del supervisor</p>
              </div>
            )}

            {(h.viajeActivo.estado === 'llamado_carga' || h.viajeActivo.estado === 'cargando' || h.viajeActivo.estado === 'cargado') && (
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <span className="text-2xl">{h.viajeActivo.estado === 'llamado_carga' ? '📢' : h.viajeActivo.estado === 'cargando' ? '⏳' : '✅'}</span>
                </div>
                <p className="text-amber-400 font-bold text-lg mb-2">
                  {h.viajeActivo.estado === 'llamado_carga' ? 'Llamado a Carga' :
                   h.viajeActivo.estado === 'cargando' ? 'Cargando...' : 'Carga Completada'}
                </p>
                <p className="text-sm text-slate-300">
                  {h.viajeActivo.estado === 'llamado_carga' ? 'Dirigite a la posición de carga asignada' :
                   h.viajeActivo.estado === 'cargando' ? 'Permanecé cerca del vehículo durante la carga' :
                   'Esperando autorización de egreso de Control de Acceso'}
                </p>
              </div>
            )}

            {h.viajeActivo.estado === 'egreso_origen' && (
              <button
                onClick={h.handleIniciarTransitoDestino}
                disabled={h.loading}
                className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <TruckIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">🚛 Partir hacia Destino</span>
              </button>
            )}

            {h.viajeActivo.estado === 'en_transito_destino' && (
              <>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                    <p className="text-purple-400 font-bold text-lg">🚛 En tránsito hacia destino</p>
                  </div>
                  <p className="text-sm text-slate-300">GPS activo - Tu ubicación se está compartiendo</p>
                  {h.location && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      📍 {h.location.lat.toFixed(6)}, {h.location.lon.toFixed(6)}
                    </p>
                  )}
                  {h.lastLocationSent && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Última ubicación: {new Date(h.lastLocationSent).toLocaleTimeString('es-AR')}
                    </p>
                  )}
                </div>
                <button
                  onClick={h.handleEnviarUbicacionManual}
                  disabled={h.sendingLocation}
                  className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <MapPinIcon className="h-5 w-5" />
                  <span>{h.sendingLocation ? 'Enviando...' : '📍 Enviar Ubicación Ahora'}</span>
                </button>

                {h.viajeActivo.destino_tiene_nodexia ? (
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-4 text-center backdrop-blur-sm">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl">🏭</span>
                    </div>
                    <p className="text-blue-400 font-semibold text-sm">Destino con Control de Acceso Nodexia</p>
                    <p className="text-xs text-slate-400 mt-1">Al llegar, presentate en la garita. Ellos registrarán tu ingreso.</p>
                  </div>
                ) : (
                  <button
                    onClick={h.handleLlegarDestino}
                    disabled={h.loading}
                    className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                    <CheckCircleIcon className="h-7 w-7 relative z-10" />
                    <span className="relative z-10">📍 Llegar a Destino</span>
                  </button>
                )}
              </>
            )}

            {h.viajeActivo.estado === 'ingresado_destino' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-4 text-center backdrop-blur-sm">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🏭</span>
                  </div>
                  <p className="text-blue-400 font-bold text-lg mb-1">Ingreso a destino registrado</p>
                  <p className="text-sm text-slate-300">
                    {h.viajeActivo.destino_tiene_nodexia
                      ? 'Aguardá instrucciones del Supervisor de descarga'
                      : 'Subí el remito firmado de entrega para completar'}
                  </p>
                </div>

                {!h.viajeActivo.destino_tiene_nodexia && (
                  <>
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                      <p className="text-sm font-semibold text-white mb-3">📄 Remito de Entrega</p>
                      {h.remitoEntregaPreview ? (
                        <div className="space-y-3">
                          <div className="relative rounded-lg overflow-hidden border border-slate-600">
                            <img src={h.remitoEntregaPreview} alt="Remito" className="w-full max-h-48 object-contain bg-slate-900" />
                            <button
                              onClick={h.limpiarRemitoEntrega}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg"
                            >
                              ✕
                            </button>
                          </div>
                          {h.remitoEntregaSubido && (
                            <p className="text-green-400 text-xs text-center">✓ Remito subido correctamente</p>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-cyan-500 transition-colors">
                          <ArrowUpTrayIcon className="h-8 w-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-300">Tocar para sacar foto o elegir archivo</span>
                          <span className="text-xs text-slate-500 mt-1">Máximo 10 MB</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={h.handleRemitoEntregaChange} />
                        </label>
                      )}
                    </div>
                    <button
                      onClick={h.handleCompletarEntrega}
                      disabled={h.loading || !h.remitoEntregaFile || h.subiendoRemitoEntrega}
                      className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center space-x-3 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                      <CheckCircleIcon className="h-7 w-7 relative z-10" />
                      <span className="relative z-10">
                        {h.subiendoRemitoEntrega ? 'Subiendo remito...' : h.loading ? 'Procesando...' : '✅ Completar Entrega'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}

            {(h.viajeActivo.estado === 'llamado_descarga' || h.viajeActivo.estado === 'descargando' || h.viajeActivo.estado === 'descargado') && (
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <span className="text-2xl">{h.viajeActivo.estado === 'llamado_descarga' ? '📢' : h.viajeActivo.estado === 'descargando' ? '⏳' : '✅'}</span>
                </div>
                <p className="text-amber-400 font-bold text-lg mb-2">
                  {h.viajeActivo.estado === 'llamado_descarga' ? 'Llamado a Descarga' :
                   h.viajeActivo.estado === 'descargando' ? 'Descargando...' : 'Descarga Completada'}
                </p>
                <p className="text-sm text-slate-300">
                  {h.viajeActivo.estado === 'llamado_descarga' ? 'Dirigite a la posición de descarga asignada' :
                   h.viajeActivo.estado === 'descargando' ? 'Permanecé cerca del vehículo durante la descarga' :
                   'Esperando autorización de egreso de Control de Acceso'}
                </p>
              </div>
            )}

            {(h.viajeActivo.estado === 'egreso_destino' || h.viajeActivo.estado === 'completado') && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/50 rounded-2xl p-8 text-center backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <span className="text-4xl">🎉</span>
                  </div>
                  <p className="text-green-400 font-bold text-2xl mb-3">¡Viaje completado!</p>
                  <p className="text-base text-slate-200 mb-2">Excelente trabajo</p>
                  <p className="text-sm text-slate-400">
                    {h.viajeActivo.estado === 'egreso_destino' ? 'Egreso registrado. Viaje casi finalizado.' : 'Viaje finalizado exitosamente.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botones de utilidad */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={h.handleReportarIncidencia}
              className="bg-slate-700 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Incidencia</span>
            </button>
            <button
              onClick={h.handleLlamarCoordinador}
              className="bg-slate-700 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
            >
              <PhoneIcon className="h-5 w-5" />
              <span>Llamar</span>
            </button>
          </div>

          {/* Observaciones */}
          {h.viajeActivo.observaciones && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-2">📝 Observaciones</h4>
              <p className="text-white text-sm">{h.viajeActivo.observaciones}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Incidencias */}
      {h.activeTab === 'incidencias' && (
        <IncidenciasTab
          onLlamarCoordinador={h.handleLlamarCoordinador}
          onReportarIncidenciaTipo={h.handleReportarIncidenciaTipo}
        />
      )}

      {/* Tab: Perfil */}
      {h.activeTab === 'perfil' && (
        <PerfilTab
          choferData={h.choferData}
          userEmail={h.user?.email || ''}
          viajesCount={h.viajes.length}
          showUploadDoc={h.showUploadDoc}
          docRefreshKey={h.docRefreshKey}
          onToggleUpload={() => h.setShowUploadDoc(!h.showUploadDoc)}
          onUploadSuccess={() => {
            h.setShowUploadDoc(false);
            h.setDocRefreshKey(k => k + 1);
          }}
        />
      )}

      <BottomNavBar
        activeTab={h.activeTab}
        onTabChange={h.setActiveTab}
        viajesCount={h.viajes.length}
      />

      {h.showQRModal && h.viajeActivo && (
        <QRModal viajeActivo={h.viajeActivo} onClose={() => h.setShowQRModal(false)} />
      )}

      {h.showMenuHamburguesa && (
        <HamburgerMenu onClose={() => h.setShowMenuHamburguesa(false)} />
      )}

      {h.showIncidenciaModal && (
        <IncidenciaModal
          viajeActivo={h.viajeActivo}
          incidenciaTipoNombre={h.incidenciaTipoNombre}
          incidenciaDescripcion={h.incidenciaDescripcion}
          onDescripcionChange={h.setIncidenciaDescripcion}
          reportandoIncidencia={h.reportandoIncidencia}
          onClose={() => h.setShowIncidenciaModal(false)}
          onEnviar={h.handleEnviarIncidencia}
        />
      )}
    </div>
  );
}

// pages/control-acceso.tsx
// Interfaz para Control de Acceso con diseño Nodexia
// Gestiona ingresos/egresos tanto en ORIGEN como en DESTINO

import { QrCodeIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import DocumentacionDetalle from '@/components/DocumentacionDetalle';
import MainLayout from '@/components/layout/MainLayout';
import HistorialAccesos from '@/components/ControlAcceso/HistorialAccesos';
import EstadoBanners from '@/components/ControlAcceso/EstadoBanners';
import { getColorEstadoUnidad, getLabelEstadoUnidad } from '@/lib/helpers/estados-helpers';
import useControlAcceso from '@/lib/hooks/useControlAcceso';

export default function ControlAcceso() {
  const h = useControlAcceso();

  return (
    <MainLayout pageTitle="Control de Acceso">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <QrCodeIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Gestión de Ingreso y Egreso</h1>
              <p className="text-slate-300 mt-1">Escaneo QR y validación de documentación</p>
            </div>
          </div>
          {h.viaje && (
            <button
              onClick={h.resetForm}
              className="px-4 py-2 text-slate-300 hover:text-slate-100 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Nuevo Escaneo
            </button>
          )}
        </div>
      </div>

      {/* QR Scanner */}
      <div className="bg-slate-800 rounded shadow-sm border border-slate-700 mb-2">
        <div className="p-2 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <QrCodeIcon className="h-5 w-5 text-blue-100" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100">Escanear Código QR</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Ingrese N° despacho o viaje (ej: DSP-20260221-001)"
              value={h.qrCode}
              onChange={(e) => h.setQrCode(e.target.value)}
              className="flex-1 px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && h.escanearQR()}
            />
            <button
              onClick={h.escanearQR}
              disabled={h.loading || !h.qrCode.trim()}
              className="bg-cyan-600 text-white px-8 py-3 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-sm"
            >
              <QrCodeIcon className="h-5 w-5" />
              <span className="font-medium">{h.loading ? 'Escaneando...' : 'Escanear'}</span>
            </button>
          </div>

          {h.message && (
            <div className={`p-4 rounded-xl flex items-center space-x-3 ${
              h.message.includes('✅') ? 'bg-green-900 text-green-100 border border-green-700' :
              h.message.includes('⚠️') ? 'bg-yellow-900 text-yellow-100 border border-yellow-700' :
              h.message.includes('📋') ? 'bg-blue-900 text-blue-100 border border-blue-700' :
              'bg-red-900 text-red-100 border border-red-700'
            }`}>
              {h.message.includes('✅') && <CheckCircleIcon className="h-5 w-5 text-green-300" />}
              {h.message.includes('⚠️') && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-300" />}
              {h.message.includes('📋') && <DocumentTextIcon className="h-5 w-5 text-blue-300" />}
              {!h.message.includes('✅') && !h.message.includes('⚠️') && !h.message.includes('📋') && <XCircleIcon className="h-5 w-5 text-red-300" />}
              <span className="font-medium">{h.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Información del Viaje */}
      {h.viaje && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg border border-slate-700 mb-6">
          {/* Header de la tarjeta */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <TruckIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{h.viaje.qr_code}</h2>
                  <p className="text-cyan-100 font-medium mt-1">Viaje #{h.viaje.numero_viaje}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-6 py-3 rounded-xl text-sm font-bold shadow-lg ${getColorEstadoUnidad(h.viaje.estado_unidad)} text-white`}>
                  {getLabelEstadoUnidad(h.viaje.estado_unidad)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Ruta */}
            <div className="mb-6 bg-slate-700/50 rounded-xl p-5 border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Origen</p>
                  <p className="text-xl font-bold text-white">{h.viaje.origen_nombre}</p>
                </div>
                <div className="px-6">
                  <div className="p-3 bg-cyan-600 rounded-full">
                    <ArrowRightIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Destino</p>
                  <p className="text-xl font-bold text-white">{h.viaje.destino_nombre}</p>
                </div>
              </div>
            </div>

            {/* Grid de información */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Camión */}
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-cyan-500 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-cyan-600 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Camión</span>
                </div>
                <p className="text-xl font-bold text-white mb-1">{h.viaje.camion.patente}</p>
                <p className="text-sm text-slate-300">{h.viaje.camion.marca}</p>
                {h.viaje.camion.año && (
                  <p className="text-xs text-slate-400 mt-1">Año {h.viaje.camion.año}</p>
                )}
              </div>

              {/* Chofer */}
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-cyan-500 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Chofer</span>
                </div>
                <p className="text-lg font-bold text-white mb-1">{h.viaje.chofer.nombre}</p>
                <p className="text-sm text-slate-300">DNI: {h.viaje.chofer.dni}</p>
                {h.viaje.chofer.telefono && (
                  <p className="text-xs text-slate-400 mt-1">Tel: {h.viaje.chofer.telefono}</p>
                )}
              </div>

              {/* Info adicional */}
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Información</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Operación</p>
                    <p className="text-sm font-semibold text-white capitalize">
                      {h.viaje.tipo_operacion === 'envio' ? '📤 Envío' : '📥 Recepción'}
                    </p>
                  </div>
                  {h.viaje.fecha_programada && (
                    <div>
                      <p className="text-xs text-slate-400">Fecha Programada</p>
                      <p className="text-sm font-semibold text-white">
                        {new Date(h.viaje.fecha_programada).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documentación */}
            <div className="mb-6 bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-5 w-5 text-slate-300" />
                  <span className="text-sm font-semibold text-slate-300">Documentación</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-semibold ${
                    h.viaje.documentacion_validada
                      ? 'bg-green-600 text-green-100'
                      : 'bg-red-600 text-red-100'
                  }`}>
                    {h.viaje.documentacion_validada ? '✅ Válida' : '❌ Faltante'}
                  </span>
                  <button
                    onClick={() => h.setShowDocumentacion(true)}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold underline transition-colors"
                  >
                    Ver Detalle
                  </button>
                </div>
              </div>

              {h.docsProvisorioBanner && h.docsProvisorioBanner.length > 0 && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 font-semibold text-sm">Documentación aprobada provisoriamente</p>
                      <p className="text-amber-200/70 text-xs mt-1">
                        {h.docsProvisorioBanner.length} documento(s) con aprobación provisoria (válida 24h). Pendiente revalidación Admin Nodexia.
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {h.docsProvisorioBanner.map((doc: any, idx: number) => (
                          <li key={idx} className="text-amber-200/60 text-xs">
                            • {doc.tipo_documento} — aprobado por {doc.aprobado_provisorio_por || 'Coordinador'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Banners contextuales y remito */}
            <EstadoBanners
              estadoUnidad={h.viaje.estado_unidad}
              tipoOperacion={h.viaje.tipo_operacion}
              documentacionValidada={h.viaje.documentacion_validada}
              remitoUrl={h.remitoUrl}
              remitoValidado={h.remitoValidado}
              loadingRemito={h.loadingRemito}
              onValidarRemito={() => h.setRemitoValidado(true)}
            />

            {/* Acciones */}
            <div className="border-t border-slate-700 pt-6">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Acciones Disponibles</p>

              {/* Banner informativo: recepción cuando camión aún no llegó */}
              {h.viaje.tipo_operacion === 'recepcion' && !['en_transito_destino', 'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino', 'completado'].includes(h.viaje.estado_unidad) && (
                <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <TruckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-300 font-semibold text-sm">Camión en camino</p>
                      <p className="text-blue-200/70 text-xs mt-1">
                        Este viaje aún está en etapa de <strong>{h.viaje.estado_unidad === 'en_transito_origen' ? 'tránsito a planta origen'
                          : h.viaje.estado_unidad === 'ingresado_origen' ? 'ingresado en planta origen'
                          : h.viaje.estado_unidad === 'llamado_carga' ? 'llamado a carga en origen'
                          : h.viaje.estado_unidad === 'cargando' ? 'cargando en planta origen'
                          : h.viaje.estado_unidad === 'cargado' ? 'cargado, pendiente egreso de origen'
                          : h.viaje.estado_unidad === 'egreso_origen' ? 'egreso de planta origen'
                          : h.viaje.estado_unidad}</strong>.
                        Podrás confirmar el ingreso a destino cuando el camión esté en tránsito hacia tu planta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {/* Confirmar Ingreso */}
                {((h.viaje.tipo_operacion === 'envio' && ['en_transito_origen', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer'].includes(h.viaje.estado_unidad)) ||
                  (h.viaje.tipo_operacion === 'recepcion' && ['en_transito_destino'].includes(h.viaje.estado_unidad))) && (
                  <button
                    onClick={h.confirmarIngreso}
                    disabled={h.loading || !h.viaje.documentacion_validada}
                    className="flex-1 bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                    title={!h.viaje.documentacion_validada ? 'No se puede confirmar ingreso: Documentación incompleta o inválida' : ''}
                  >
                    <CheckCircleIcon className="h-6 w-6" />
                    <span>{h.viaje.tipo_operacion === 'envio' ? 'Confirmar Ingreso a Planta' : 'Confirmar Ingreso a Destino'}</span>
                  </button>
                )}

                {/* Warning: doc not validated */}
                {((h.viaje.tipo_operacion === 'envio' && ['en_transito_origen', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer'].includes(h.viaje.estado_unidad)) ||
                  (h.viaje.tipo_operacion === 'recepcion' && ['en_transito_destino'].includes(h.viaje.estado_unidad))) &&
                  !h.viaje.documentacion_validada && (
                  <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <p className="text-red-400 text-sm font-medium">
                        No se puede confirmar ingreso: La documentación está incompleta, vencida o pendiente de validación. Revisar detalle arriba.
                      </p>
                    </div>
                  </div>
                )}

                {/* Asignar Playa */}
                {h.viaje.tipo_operacion === 'envio' && h.viaje.estado_unidad === 'ingresado_origen' && (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      id="playa-input"
                      type="text"
                      defaultValue="1"
                      placeholder="N° playa"
                      className="w-20 px-3 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                    <button
                      onClick={() => {
                        const playa = (document.getElementById('playa-input') as HTMLInputElement)?.value || '1';
                        h.handleAsignarPlaya(playa);
                      }}
                      disabled={h.loading}
                      className="flex-1 bg-cyan-600 text-white px-6 py-4 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                      <TruckIcon className="h-6 w-6" />
                      <span>Asignar Playa de Espera</span>
                    </button>
                  </div>
                )}

                {/* Validar Documentación */}
                {h.viaje.tipo_operacion === 'envio' && (h.viaje.estado_unidad === 'cargado' || h.viaje.estado_unidad === 'egreso_origen') && (
                  <button
                    onClick={h.handleValidarDocumentacion}
                    disabled={h.loading || h.viaje.documentacion_validada}
                    className="bg-purple-600 text-white px-6 py-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <DocumentTextIcon className="h-6 w-6" />
                    <span>{h.viaje.documentacion_validada ? 'Documentación Validada ✓' : 'Validar Documentación'}</span>
                  </button>
                )}

                {/* Confirmar Egreso */}
                {((h.viaje.tipo_operacion === 'envio' && (h.viaje.estado_unidad === 'cargado' || h.viaje.estado_unidad === 'egreso_origen') && h.viaje.documentacion_validada && h.remitoValidado) ||
                  (h.viaje.tipo_operacion === 'recepcion' && (h.viaje.estado_unidad === 'descargado' || h.viaje.estado_unidad === 'egreso_destino'))) && (
                  <button
                    onClick={h.confirmarEgreso}
                    disabled={h.loading}
                    className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <CheckCircleIcon className="h-6 w-6" />
                    <span>{h.viaje.tipo_operacion === 'envio' ? 'Confirmar Egreso de Planta' : 'Confirmar Egreso de Destino'}</span>
                  </button>
                )}

                {/* Llamar a Descarga */}
                {h.viaje.tipo_operacion === 'recepcion' && h.viaje.estado_unidad === 'ingresado_destino' && (
                  <button
                    onClick={h.llamarADescarga}
                    disabled={h.loading}
                    className="flex-1 bg-cyan-600 text-white px-6 py-4 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <span>📢</span>
                    <span>Llamar a Descarga</span>
                  </button>
                )}

                {/* Crear Incidencia */}
                <button
                  onClick={h.crearIncidencia}
                  className="bg-amber-600 text-white px-6 py-4 rounded-xl hover:bg-amber-700 flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <ExclamationTriangleIcon className="h-6 w-6" />
                  <span>Crear Incidencia</span>
                </button>

                {/* Resetear */}
                <button
                  onClick={h.resetForm}
                  className="bg-slate-600 text-white px-6 py-4 rounded-xl hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Accesos */}
      <HistorialAccesos
        historial={h.historial}
        loadingHistorial={h.loadingHistorial}
        onActualizar={h.cargarHistorial}
      />

      {/* Información */}
      <div className="bg-blue-900/20 border border-blue-700 rounded p-2 shadow-sm">
        <h3 className="font-bold text-blue-300 mb-3 flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5" />
          <span>ℹ️ Instrucciones</span>
        </h3>
        <div className="text-blue-200 text-sm space-y-2">
          <p>• Ingresa el número de viaje o escanea el código QR</p>
          <p>• Verifica la información del viaje antes de confirmar</p>
          <p>• Puedes probar con cualquier número de viaje existente en el sistema</p>
          <p>• El historial se actualiza automáticamente cada 30 segundos</p>
        </div>
      </div>

      {/* Modal de Documentación */}
      {h.showDocumentacion && h.viaje && (
        <DocumentacionDetalle
          numeroViaje={h.viaje.numero_viaje}
          choferId={h.viaje.chofer_id}
          camionId={h.viaje.camion_id}
          acopladoId={h.viaje.acoplado_id}
          onClose={h.handleCloseDocumentacion}
        />
      )}

      {/* Modal de Incidencia */}
      {h.showIncidenciaModal && h.viaje && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
                  Crear Incidencia
                </h3>
                <button onClick={() => h.setShowIncidenciaModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              <div className="text-sm text-slate-400 mb-4">
                Viaje: <span className="text-white font-medium">{h.viaje.numero_viaje}</span>
              </div>

              {/* Tipo */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 block mb-1">Tipo de incidencia</label>
                <select
                  value={h.incidenciaTipo}
                  onChange={e => h.setIncidenciaTipo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="documentacion_faltante">📄 Documentación Faltante</option>
                  <option value="retraso">⏰ Retraso</option>
                  <option value="averia_camion">🔧 Avería Camión</option>
                  <option value="producto_danado">📦 Producto Dañado</option>
                  <option value="problema_carga">⚠️ Problema de Carga</option>
                  <option value="problema_mecanico">🛠️ Problema Mecánico</option>
                  <option value="accidente">🚨 Accidente</option>
                  <option value="otro">❓ Otro</option>
                </select>
              </div>

              {/* Severidad */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 block mb-1">Severidad</label>
                <div className="flex gap-2">
                  {[
                    { value: 'baja', label: '🟢 Baja', color: 'border-green-500 bg-green-500/20' },
                    { value: 'media', label: '🟡 Media', color: 'border-yellow-500 bg-yellow-500/20' },
                    { value: 'alta', label: '🟠 Alta', color: 'border-orange-500 bg-orange-500/20' },
                    { value: 'critica', label: '🔴 Crítica', color: 'border-red-500 bg-red-500/20' },
                  ].map(s => (
                    <button
                      key={s.value}
                      onClick={() => h.setIncidenciaSeveridad(s.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        h.incidenciaSeveridad === s.value ? `${s.color} text-white` : 'border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 block mb-1">Descripción</label>
                <textarea
                  value={h.incidenciaDesc}
                  onChange={e => h.setIncidenciaDesc(e.target.value)}
                  placeholder="Describe la incidencia con detalle..."
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => h.setShowIncidenciaModal(false)}
                  className="flex-1 bg-slate-700 text-slate-300 px-4 py-3 rounded-xl hover:bg-slate-600 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={h.enviarIncidencia}
                  disabled={h.incidenciaLoading || !h.incidenciaDesc.trim()}
                  className="flex-1 bg-amber-600 text-white px-4 py-3 rounded-xl hover:bg-amber-700 disabled:opacity-50 font-medium transition-all"
                >
                  {h.incidenciaLoading ? 'Creando...' : '⚠️ Crear Incidencia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

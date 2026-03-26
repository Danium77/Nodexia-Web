import React from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DespachoForm from '@/components/Despachos/DespachoForm';
import DespachoTableRow from '@/components/Despachos/DespachoTableRow';
import DespachoTabs, { filterDespachosByTab } from '@/components/Despachos/DespachoTabs';
import DespachoModals from '@/components/Despachos/DespachoModals';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useCrearDespacho from '@/lib/hooks/useCrearDespacho';

const CrearDespacho = () => {
  const h = useCrearDespacho();

  if (!h.user) {
    return <LoadingSpinner text="Cargando..." fullScreen />;
  }

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={h.user.email} userName={h.userName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userEmail={h.user.email}
          userName={h.userName}
          pageTitle="Crear Despachos"
          empresaNombre={h.empresaActiva?.empresas?.nombre}
        />
        <main className="flex-1 p-2 max-w-full overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 text-cyan-400">Crear nuevo despacho</h3>

          {h.errorMsg && <p className="text-red-400 mb-4">{h.errorMsg}</p>}
          {h.successMsg && <p className="text-green-400 mb-4">{h.successMsg}</p>}

          <DespachoForm
            formRows={h.formRows}
            onRowChange={h.handleRowChange}
            onOrigenSelect={h.handleOrigenSelect}
            onDestinoSelect={h.handleDestinoSelect}
            onOpenTurnoModal={h.handleOpenTurnoModal}
            onSaveRow={h.handleSaveRow}
            onFormRowsChange={h.setFormRows}
            loading={h.loading}
            today={h.today}
          />

          {h.isTurnoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0e1a2d] p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-cyan-300">Reservar turno de recepcion</h4>
                  <button
                    type="button"
                    onClick={() => h.setIsTurnoModalOpen(false)}
                    className="text-slate-300 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha de turno</label>
                    <input
                      type="date"
                      value={h.turnoFecha}
                      min={h.today}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        h.setTurnoFecha(newDate);
                        const row = h.formRows.find((r: any) => r.tempId === h.turnoRowTempId);
                        if (row?.turno_empresa_planta_id) {
                          await h.refreshVentanasTurno(row.turno_empresa_planta_id, newDate);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="flex items-end">
                    {h.turnoSelectedSlot && (
                      <div className="text-sm text-cyan-300 font-mono font-bold">
                        Seleccionado: {h.turnoSelectedSlot.hora_inicio}-{h.turnoSelectedSlot.hora_fin}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  {h.loadingTurnos && (
                    <p className="text-slate-400 text-sm">Cargando disponibilidad...</p>
                  )}
                  {!h.loadingTurnos && h.turnoSlots.length === 0 && (
                    <div className="text-sm">
                      <p className="text-slate-400">No hay slots activos para la fecha seleccionada.</p>
                      {h.turnoDiasDisponibles.length > 0 && (
                        <p className="text-cyan-400/80 mt-1">
                          Dias con ventanas: {h.turnoDiasDisponibles.map((d: number) => ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][d]).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  {!h.loadingTurnos && h.turnoSlots.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Selecciona un horario:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-auto">
                        {h.turnoSlots.map((s: any, i: number) => {
                          const pct = s.capacidad > 0 ? s.ocupados / s.capacidad : 0;
                          const full = pct >= 1;
                          const isSelected = h.turnoSelectedSlot?.hora_inicio === s.hora_inicio && h.turnoSelectedSlot?.ventana_id === s.ventana_id;
                          const border = isSelected ? 'border-cyan-400 ring-1 ring-cyan-400' : full ? 'border-red-500/40' : pct >= 0.5 ? 'border-amber-500/40' : 'border-emerald-500/40';
                          const bgc = isSelected ? 'bg-cyan-500/20' : full ? 'bg-red-500/10' : pct >= 0.5 ? 'bg-amber-500/10' : 'bg-emerald-500/10';
                          const bar = full ? 'bg-red-500' : pct >= 0.5 ? 'bg-amber-500' : 'bg-emerald-500';
                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={full}
                              onClick={() => h.setTurnoSelectedSlot(s)}
                              className={`rounded-lg border ${border} ${bgc} p-2 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110`}
                            >
                              <div className="text-sm font-mono font-bold text-slate-100">{s.hora_inicio}-{s.hora_fin}</div>
                              <div className="text-[10px] text-slate-400 truncate">{s.ventana_nombre}</div>
                              <div className="text-xs text-slate-300">{s.disponibles} disp.</div>
                              <div className="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => h.setIsTurnoModalOpen(false)}
                    className="px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={h.savingTurno || !h.turnoSelectedSlot}
                    onClick={h.handleConfirmarReservaTurno}
                    className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                  >
                    {h.savingTurno ? 'Reservando...' : 'Confirmar turno'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selection toolbar */}
          <div className="flex justify-between items-center mt-8 mb-4">
            <h3 className="text-xl font-semibold text-cyan-400">Despachos Generados</h3>
            <div className="flex gap-2 items-center">
              {h.selectedDespachos.size > 0 && (
                <span className="text-sm text-cyan-400 mr-2">
                  {h.selectedDespachos.size} seleccionado(s)
                </span>
              )}
              {h.selectedDespachos.size > 0 && (
                <button
                  onClick={h.handleDeleteSelected}
                  disabled={h.deletingDespachos}
                  className={`px-3 py-1 text-white text-sm rounded-md transition-colors ${
                    h.deletingDespachos
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title="Eliminar despachos seleccionados"
                >
                  {h.deletingDespachos ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <DespachoTabs
            activeTab={h.activeTab}
            onTabChange={h.setActiveTab}
            dispatches={h.generatedDispatches}
          />

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-max bg-[#1b273b] p-3 rounded-lg shadow-lg" key={h.forceRefresh}>
              <table className="w-full table-auto divide-y divide-gray-700">
                <thead className="bg-[#0e1a2d]">
                  <tr>
                    <th className="px-2 py-2 text-center w-8">
                      <input
                        type="checkbox"
                        checked={h.selectAll}
                        onChange={h.handleSelectAll}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                        title="Seleccionar todos"
                      />
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Pedido ID</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Fecha</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-16">Hora</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Origen</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Destino</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Prioridad</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Transporte</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-24">Estado</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-slate-200">
                  {(() => {
                    const filteredDispatches = filterDespachosByTab(h.generatedDispatches, h.activeTab);

                    if (filteredDispatches.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} className="px-2 py-6 text-center text-slate-400">
                            {h.loadingGenerated
                              ? "Cargando despachos..."
                              : h.activeTab === 'pendientes'
                                ? "No hay despachos pendientes de asignación"
                                : h.activeTab === 'en_proceso'
                                  ? "No hay despachos en proceso"
                                  : h.activeTab === 'demorados'
                                    ? "No hay viajes demorados (con recursos pero fuera de horario)"
                                    : h.activeTab === 'expirados'
                                      ? "No hay despachos expirados"
                                      : "No hay despachos con todos los viajes asignados"}
                          </td>
                        </tr>
                      );
                    }

                    return filteredDispatches.map(dispatch => (
                      <DespachoTableRow
                        key={dispatch.id}
                        dispatch={dispatch}
                        activeTab={h.activeTab}
                        isSelected={h.selectedDespachos.has(dispatch.id)}
                        isExpanded={h.expandedDespachos.has(dispatch.id)}
                        viajes={h.viajesDespacho[dispatch.id] || []}
                        onSelect={h.handleSelectDespacho}
                        onToggleExpand={h.handleToggleExpandDespacho}
                        onAssignTransport={h.handleAssignTransport}
                        onOpenRedNodexia={h.handleOpenRedNodexia}
                        onOpenCancelar={h.handleOpenCancelarModal}
                        onOpenTimeline={(despachoId, pedidoId) => {
                          h.setTimelineDespachoId(despachoId);
                          h.setTimelinePedidoId(pedidoId);
                          h.setIsTimelineModalOpen(true);
                        }}
                        onOpenReprogram={(d) => {
                          h.setSelectedDispatchForReprogram(d);
                          h.setIsReprogramarModalOpen(true);
                        }}
                        onOpenEditar={(d) => {
                          h.setSelectedDispatchForEdit(d);
                          h.setIsEditarModalOpen(true);
                        }}
                        onVerEstadoRed={h.handleVerEstadoRed}
                        onReasignarViaje={h.handleReasignarViaje}
                        onCancelarViaje={h.handleCancelarViajeCoordinador}
                      />
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* All modals */}
      <DespachoModals
        user={h.user}
        empresaPlanta={h.empresaActiva}
        isAssignModalOpen={h.isAssignModalOpen}
        selectedDispatchForAssign={h.selectedDispatchForAssign}
        onCloseAssignModal={h.handleCloseAssignModal}
        onAssignSuccess={h.handleAssignSuccess}
        isRedNodexiaModalOpen={h.isRedNodexiaModalOpen}
        selectedDispatchForRed={h.selectedDispatchForRed}
        selectedViajeForRed={h.selectedViajeForRed}
        onCloseRedNodexia={h.handleCloseRedNodexia}
        isVerEstadoModalOpen={h.isVerEstadoModalOpen}
        selectedViajeRedId={h.selectedViajeRedId}
        selectedViajeNumero={h.selectedViajeNumero}
        onCloseVerEstado={h.handleCloseVerEstado}
        onAceptarOferta={h.handleAceptarOfertaDesdeModal}
        showDeleteConfirm={h.showDeleteConfirm}
        despachosPendingDelete={h.despachosPendingDelete}
        onCloseDeleteConfirm={() => {
          h.setShowDeleteConfirm(false);
          h.setDespachosPendingDelete(new Set());
        }}
        onConfirmDelete={h.executeDelete}
        isReprogramarModalOpen={h.isReprogramarModalOpen}
        selectedDispatchForReprogram={h.selectedDispatchForReprogram}
        onCloseReprogramar={() => {
          h.setIsReprogramarModalOpen(false);
          h.setSelectedDispatchForReprogram(null);
        }}
        onReprogramarSuccess={() => {
          h.fetchGeneratedDispatches(h.user.id, true);
          h.setTimelineRefreshTrigger(prev => prev + 1);
        }}
        isEditarModalOpen={h.isEditarModalOpen}
        selectedDispatchForEdit={h.selectedDispatchForEdit}
        onCloseEditar={() => {
          h.setIsEditarModalOpen(false);
          h.setSelectedDispatchForEdit(null);
        }}
        onEditarSuccess={() => {
          h.fetchGeneratedDispatches(h.user.id, true);
          h.setTimelineRefreshTrigger(prev => prev + 1);
        }}
        isCancelarModalOpen={h.isCancelarModalOpen}
        selectedDispatchForCancel={h.selectedDispatchForCancel}
        motivoCancelacion={h.motivoCancelacion}
        onMotivoCancelacionChange={h.setMotivoCancelacion}
        onConfirmarCancelacion={h.handleConfirmarCancelacion}
        onCloseCancelar={h.handleCloseCancelarModal}
        deletingDespachos={h.deletingDespachos}
        isTimelineModalOpen={h.isTimelineModalOpen}
        timelineDespachoId={h.timelineDespachoId}
        timelinePedidoId={h.timelinePedidoId}
        timelineRefreshTrigger={h.timelineRefreshTrigger}
        onCloseTimeline={() => h.setIsTimelineModalOpen(false)}
      />
    </div>
  );
};

export default CrearDespacho;

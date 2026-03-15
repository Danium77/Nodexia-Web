import React from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import DespachoForm from '../components/Despachos/DespachoForm';
import DespachoTableRow from '../components/Despachos/DespachoTableRow';
import DespachoTabs, { filterDespachosByTab } from '../components/Despachos/DespachoTabs';
import DespachoModals from '../components/Despachos/DespachoModals';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useCrearDespacho from '../lib/hooks/useCrearDespacho';

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
          empresaNombre={h.empresaPlanta?.empresas?.nombre}
        />
        <main className="flex-1 p-2 max-w-full overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 text-cyan-400">Crear nuevo despacho</h3>

          {h.errorMsg && <p className="text-red-400 mb-4">{h.errorMsg}</p>}
          {h.successMsg && <p className="text-green-400 mb-4">{h.successMsg}</p>}

          <DespachoForm
            formRows={h.formRows}
            onRowChange={h.handleRowChange}
            onSaveRow={h.handleSaveRow}
            onFormRowsChange={h.setFormRows}
            loading={h.loading}
            today={h.today}
          />

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
        empresaPlanta={h.empresaPlanta}
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

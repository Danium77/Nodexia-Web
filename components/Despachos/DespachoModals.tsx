import React from 'react';
import AssignTransportModal from '@/components/Modals/AssignTransportModal';
import AsignarUnidadModal from '@/components/Transporte/AsignarUnidadModal';
import ConfirmDeleteModal from '@/components/Modals/ConfirmDeleteModal';
import CancelarDespachoModal from '@/components/Modals/CancelarDespachoModal';
import ReprogramarModal from '@/components/Modals/ReprogramarModal';
import EditarDespachoModal from '@/components/Modals/EditarDespachoModal';
import AbrirRedNodexiaModal from '@/components/Transporte/AbrirRedNodexiaModal';
import VerEstadoRedNodexiaModal from '@/components/Transporte/VerEstadoRedNodexiaModal';
import TimelineDespachoModal from './TimelineDespachoModal';
import type { GeneratedDispatch } from '@/lib/hooks/useCrearDespacho';

interface DespachoModalsProps {
  // Auth
  user: any;
  empresaPlanta: any;
  esTransporte?: boolean;

  // Assign
  isAssignModalOpen: boolean;
  selectedDispatchForAssign: GeneratedDispatch | null;
  onCloseAssignModal: () => void;
  onAssignSuccess: () => void;

  // Red Nodexia
  isRedNodexiaModalOpen: boolean;
  selectedDispatchForRed: GeneratedDispatch | null;
  selectedViajeForRed: any;
  onCloseRedNodexia: () => void;

  // Ver Estado Red
  isVerEstadoModalOpen: boolean;
  selectedViajeRedId: string;
  selectedViajeNumero: string;
  onCloseVerEstado: () => void;
  onAceptarOferta: (ofertaId: string, transporteId: string) => Promise<void>;

  // Delete confirm
  showDeleteConfirm: boolean;
  despachosPendingDelete: Set<string>;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => void;

  // Reprogramar
  isReprogramarModalOpen: boolean;
  selectedDispatchForReprogram: GeneratedDispatch | null;
  onCloseReprogramar: () => void;
  onReprogramarSuccess: () => void;

  // Editar
  isEditarModalOpen: boolean;
  selectedDispatchForEdit: GeneratedDispatch | null;
  onCloseEditar: () => void;
  onEditarSuccess: () => void;

  // Cancelar
  isCancelarModalOpen: boolean;
  selectedDispatchForCancel: GeneratedDispatch | null;
  motivoCancelacion: string;
  onMotivoCancelacionChange: (v: string) => void;
  onConfirmarCancelacion: () => void;
  onCloseCancelar: () => void;
  deletingDespachos: boolean;

  // Timeline
  isTimelineModalOpen: boolean;
  timelineDespachoId: string;
  timelinePedidoId: string;
  timelineRefreshTrigger: number;
  onCloseTimeline: () => void;
}

const DespachoModals: React.FC<DespachoModalsProps> = ({
  user,
  empresaPlanta,
  esTransporte = false,
  // Assign
  isAssignModalOpen,
  selectedDispatchForAssign,
  onCloseAssignModal,
  onAssignSuccess,
  // Red Nodexia
  isRedNodexiaModalOpen,
  selectedDispatchForRed,
  selectedViajeForRed,
  onCloseRedNodexia,
  // Ver Estado
  isVerEstadoModalOpen,
  selectedViajeRedId,
  selectedViajeNumero,
  onCloseVerEstado,
  onAceptarOferta,
  // Delete
  showDeleteConfirm,
  despachosPendingDelete,
  onCloseDeleteConfirm,
  onConfirmDelete,
  // Reprogramar
  isReprogramarModalOpen,
  selectedDispatchForReprogram,
  onCloseReprogramar,
  onReprogramarSuccess,
  // Editar
  isEditarModalOpen,
  selectedDispatchForEdit,
  onCloseEditar,
  onEditarSuccess,
  // Cancelar
  isCancelarModalOpen,
  selectedDispatchForCancel,
  motivoCancelacion,
  onMotivoCancelacionChange,
  onConfirmarCancelacion,
  onCloseCancelar,
  deletingDespachos,
  // Timeline
  isTimelineModalOpen,
  timelineDespachoId,
  timelinePedidoId,
  timelineRefreshTrigger,
  onCloseTimeline,
}) => {
  return (
    <>
      {/* Modal de Asignación de Transporte / Unidad */}
      {selectedDispatchForAssign && (
        esTransporte ? (
          <AsignarUnidadModal
            isOpen={isAssignModalOpen}
            onClose={onCloseAssignModal}
            despacho={{
              id: selectedDispatchForAssign.id,
              pedido_id: selectedDispatchForAssign.pedido_id,
              origen: selectedDispatchForAssign.origen,
              origen_id: (selectedDispatchForAssign as any).origen_id,
              destino: selectedDispatchForAssign.destino,
              destino_id: (selectedDispatchForAssign as any).destino_id,
              scheduled_local_date: selectedDispatchForAssign.fecha_despacho || '',
              scheduled_local_time: selectedDispatchForAssign.hora_despacho || '',
            }}
            onSuccess={onAssignSuccess}
          />
        ) : (
          <AssignTransportModal
            isOpen={isAssignModalOpen}
            onClose={onCloseAssignModal}
            dispatch={selectedDispatchForAssign}
            onAssignSuccess={onAssignSuccess}
          />
        )
      )}

      {/* Modal de Red Nodexia */}
      {isRedNodexiaModalOpen && selectedDispatchForRed && selectedViajeForRed && (
        <AbrirRedNodexiaModal
          isOpen={isRedNodexiaModalOpen}
          onClose={onCloseRedNodexia}
          viajeId={selectedViajeForRed.id}
          numeroViaje={selectedViajeForRed.numero_viaje}
          origen={selectedDispatchForRed.origen}
          destino={selectedDispatchForRed.destino}
          empresaId={empresaPlanta?.empresa_id || ''}
          usuarioId={user?.id || ''}
        />
      )}

      {/* Modal Ver Estado Red Nodexia */}
      {isVerEstadoModalOpen && selectedViajeRedId && (
        <VerEstadoRedNodexiaModal
          viajeRedId={selectedViajeRedId}
          viajeNumero={selectedViajeNumero}
          onClose={onCloseVerEstado}
          onAceptarOferta={onAceptarOferta}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={onCloseDeleteConfirm}
        onConfirm={onConfirmDelete}
        message={`¿Estás seguro de que deseas eliminar ${despachosPendingDelete.size} despacho(s)?`}
        itemCount={despachosPendingDelete.size}
      />

      {/* Modal Reprogramar */}
      <ReprogramarModal
        isOpen={isReprogramarModalOpen}
        onClose={onCloseReprogramar}
        despacho={selectedDispatchForReprogram ? {
          id: selectedDispatchForReprogram.id,
          pedido_id: selectedDispatchForReprogram.pedido_id,
          origen: selectedDispatchForReprogram.origen,
          destino: selectedDispatchForReprogram.destino,
          fecha_despacho: selectedDispatchForReprogram.fecha_despacho,
          hora_despacho: selectedDispatchForReprogram.hora_despacho
        } : null}
        onSuccess={onReprogramarSuccess}
      />

      {/* Modal Editar */}
      <EditarDespachoModal
        isOpen={isEditarModalOpen}
        onClose={onCloseEditar}
        despacho={selectedDispatchForEdit ? {
          id: selectedDispatchForEdit.id,
          pedido_id: selectedDispatchForEdit.pedido_id,
          origen: selectedDispatchForEdit.origen,
          destino: selectedDispatchForEdit.destino,
          fecha_despacho: selectedDispatchForEdit.fecha_despacho,
          hora_despacho: selectedDispatchForEdit.hora_despacho,
          observaciones: selectedDispatchForEdit.observaciones
        } : null}
        onSuccess={onEditarSuccess}
      />

      {/* Modal Cancelar Despacho */}
      <CancelarDespachoModal
        isOpen={isCancelarModalOpen}
        dispatch={selectedDispatchForCancel}
        motivoCancelacion={motivoCancelacion}
        onMotivoCancelacionChange={onMotivoCancelacionChange}
        onConfirmar={onConfirmarCancelacion}
        onClose={onCloseCancelar}
        loading={deletingDespachos}
      />

      {/* Modal Timeline/Historial */}
      <TimelineDespachoModal
        isOpen={isTimelineModalOpen}
        onClose={onCloseTimeline}
        despachoId={timelineDespachoId}
        pedidoId={timelinePedidoId}
        refreshTrigger={timelineRefreshTrigger}
      />
    </>
  );
};

export default DespachoModals;

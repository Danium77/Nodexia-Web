// components/ControlAcceso/ModalSeleccionarUbicacion.tsx
// Modal obligatorio para usuarios de Control de Acceso sin ubicación asignada

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useUbicacionActual } from '../../lib/hooks/useUbicacionActual';

export default function ModalSeleccionarUbicacion() {
  const {
    ubicacionesDisponibles,
    setUbicacionActualId,
    loading,
  } = useUbicacionActual();

  const handleSeleccionar = async (ubicacionId: string) => {
    await setUbicacionActualId(ubicacionId);
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
                  </div>
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900"
                    >
                      Seleccione su ubicación
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      Para usar Control de Acceso, debe indicar en qué planta o depósito está trabajando
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : ubicacionesDisponibles.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      No hay ubicaciones disponibles para su empresa.
                      Contacte al administrador.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ubicacionesDisponibles.map((ubicacion) => (
                      <button
                        key={ubicacion.id}
                        onClick={() => handleSeleccionar(ubicacion.id)}
                        className="w-full flex items-center gap-3 p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <MapPinIcon className="h-6 w-6 text-gray-400 group-hover:text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-blue-600">
                            {ubicacion.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ubicacion.tipo.charAt(0).toUpperCase() + ubicacion.tipo.slice(1)}
                            {ubicacion.cuit && ` • CUIT: ${ubicacion.cuit}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Nota:</strong> Podrá cambiar de ubicación más tarde desde el selector en la barra superior.
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

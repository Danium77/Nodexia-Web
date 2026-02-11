// components/ControlAcceso/UbicacionSelector.tsx
// Selector de ubicación para usuarios de Control de Acceso

import { Fragment } from 'react';
import { MapPinIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { useUbicacionActual } from '../../lib/hooks/useUbicacionActual';

export default function UbicacionSelector() {
  const {
    ubicacionActual,
    ubicacionesDisponibles,
    setUbicacionActualId,
    loading,
  } = useUbicacionActual();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
        <MapPinIcon className="h-5 w-5 animate-pulse" />
        <span>Cargando...</span>
      </div>
    );
  }

  if (ubicacionesDisponibles.length === 0) {
    return null;
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
        <MapPinIcon className="h-5 w-5" />
        <span className="hidden sm:inline">
          {ubicacionActual?.nombre || 'Seleccionar ubicación'}
        </span>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              Seleccione su ubicación
            </div>
            {ubicacionesDisponibles.map((ubicacion) => (
              <Menu.Item key={ubicacion.id}>
                {({ active }) => (
                  <button
                    onClick={() => setUbicacionActualId(ubicacion.id)}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } ${
                      ubicacionActual?.id === ubicacion.id ? 'bg-blue-50' : ''
                    } group flex w-full items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-medium">{ubicacion.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {ubicacion.tipo.charAt(0).toUpperCase() + ubicacion.tipo.slice(1)}
                        {ubicacion.cuit && ` • CUIT: ${ubicacion.cuit}`}
                      </div>
                    </div>
                    {ubicacionActual?.id === ubicacion.id && (
                      <CheckIcon className="h-5 w-5 text-blue-600 ml-2" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

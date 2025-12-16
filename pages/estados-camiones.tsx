// pages/estados-camiones.tsx
// Panel de estados generales de todos los camiones

import { TruckIcon, ClockIcon, CheckCircleIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import MainLayout from '../components/layout/MainLayout';

interface ViajeEstado {
  id: string;
  numero_viaje: string;
  estado_viaje: string;
  producto: string;
  chofer: {
    nombre: string;
    dni: string;
  };
  camion: {
    patente: string;
    marca: string;
  };
  fecha_ingreso?: string;
  hora_estimada_salida?: string;
}

export default function EstadosCamiones() {
  // Datos demo simulados de diferentes estados
  const viajesDemo: ViajeEstado[] = [
    {
      id: '1',
      numero_viaje: 'VJ-2025-001',
      estado_viaje: 'ingresado_planta',
      producto: 'Soja - 35 toneladas',
      chofer: { nombre: 'Carlos Mendoza', dni: '32.456.789' },
      camion: { patente: 'ABC123', marca: 'Mercedes-Benz' },
      fecha_ingreso: '2025-10-07 08:30',
      hora_estimada_salida: '14:00'
    },
    {
      id: '2',
      numero_viaje: 'VJ-2025-002',
      estado_viaje: 'confirmado',
      producto: 'Trigo - 28 toneladas',
      chofer: { nombre: 'Roberto Silva', dni: '28.123.456' },
      camion: { patente: 'XYZ789', marca: 'Scania' },
      hora_estimada_salida: '16:00'
    },
    {
      id: '3',
      numero_viaje: 'VJ-2025-003',
      estado_viaje: 'llamado_carga',
      producto: 'Maíz - 30 toneladas',
      chofer: { nombre: 'María González', dni: '35.789.123' },
      camion: { patente: 'DEF456', marca: 'Volvo' },
      fecha_ingreso: '2025-10-07 07:15',
      hora_estimada_salida: '15:30'
    },
    {
      id: '4',
      numero_viaje: 'VJ-2025-004',
      estado_viaje: 'cargando',
      producto: 'Girasol - 25 toneladas',
      chofer: { nombre: 'Juan Pérez', dni: '29.456.789' },
      camion: { patente: 'GHI789', marca: 'Iveco' },
      fecha_ingreso: '2025-10-07 06:45',
      hora_estimada_salida: '13:20'
    },
    {
      id: '5',
      numero_viaje: 'VJ-2025-005',
      estado_viaje: 'carga_finalizada',
      producto: 'Sorgo - 32 toneladas',
      chofer: { nombre: 'Luis Rodríguez', dni: '31.234.567' },
      camion: { patente: 'JKL012', marca: 'Mercedes-Benz' },
      fecha_ingreso: '2025-10-07 05:30',
      hora_estimada_salida: '12:00'
    },
    {
      id: '6',
      numero_viaje: 'VJ-2025-006',
      estado_viaje: 'egresado_planta',
      producto: 'Soja - 28 toneladas',
      chofer: { nombre: 'Pedro Martín', dni: '33.678.901' },
      camion: { patente: 'MNO345', marca: 'Scania' },
      fecha_ingreso: '2025-10-07 04:00',
      hora_estimada_salida: '11:30'
    },
    {
      id: '7',
      numero_viaje: 'VJ-2025-007',
      estado_viaje: 'confirmado',
      producto: 'Trigo - 31 toneladas',
      chofer: { nombre: 'Ana López', dni: '27.890.123' },
      camion: { patente: 'PQR678', marca: 'Volvo' },
      hora_estimada_salida: '17:00'
    },
    {
      id: '8',
      numero_viaje: 'VJ-2025-008',
      estado_viaje: 'ingresado_planta',
      producto: 'Cebada - 26 toneladas',
      chofer: { nombre: 'Fernando Castro', dni: '30.345.678' },
      camion: { patente: 'STU901', marca: 'Mercedes-Benz' },
      fecha_ingreso: '2025-10-07 09:15',
      hora_estimada_salida: '15:45'
    }
  ];

  // Función para obtener el color según el estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return 'text-blue-400 bg-blue-900/30';
      case 'ingresado_planta':
        return 'text-green-400 bg-green-900/30';
      case 'llamado_carga':
        return 'text-yellow-400 bg-yellow-900/30';
      case 'cargando':
        return 'text-orange-400 bg-orange-900/30';
      case 'carga_finalizada':
        return 'text-purple-400 bg-purple-900/30';
      case 'egresado_planta':
        return 'text-gray-400 bg-gray-900/30';
      default:
        return 'text-gray-400 bg-gray-900/30';
    }
  };

  // Función para obtener el texto del estado
  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return 'Por Arribar';
      case 'ingresado_planta':
        return 'En Planta';
      case 'llamado_carga':
        return 'Llamado a Carga';
      case 'cargando':
        return 'Cargando';
      case 'carga_finalizada':
        return 'Listo para Salir';
      case 'egresado_planta':
        return 'Ha Salido';
      default:
        return estado;
    }
  };

  // Función para obtener el ícono según el estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return <ClockIcon className="h-5 w-5" />;
      case 'ingresado_planta':
        return <TruckIcon className="h-5 w-5" />;
      case 'llamado_carga':
      case 'cargando':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'carga_finalizada':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'egresado_planta':
        return <ArrowRightOnRectangleIcon className="h-5 w-5" />;
      default:
        return <TruckIcon className="h-5 w-5" />;
    }
  };

  // Contar estados para el resumen
  const estadosCount = {
    confirmado: viajesDemo.filter(v => v.estado_viaje === 'confirmado').length,
    ingresado_planta: viajesDemo.filter(v => v.estado_viaje === 'ingresado_planta').length,
    llamado_carga: viajesDemo.filter(v => v.estado_viaje === 'llamado_carga').length,
    cargando: viajesDemo.filter(v => v.estado_viaje === 'cargando').length,
    carga_finalizada: viajesDemo.filter(v => v.estado_viaje === 'carga_finalizada').length,
    egresado_planta: viajesDemo.filter(v => v.estado_viaje === 'egresado_planta').length,
  };

  return (
    <MainLayout pageTitle="Estados de Camiones">
      {/* Header específico de la página */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <TruckIcon className="h-8 w-8 text-indigo-100" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Monitor General de Vehículos</h1>
            <p className="text-slate-300 mt-1">
              Estados en tiempo real de todos los camiones en planta
            </p>
          </div>
        </div>
      </div>

      {/* Resumen de Estados */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 mb-2">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400">Por Arribar</p>
              <p className="text-2xl font-bold text-blue-300">{estadosCount.confirmado}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-400">En Planta</p>
              <p className="text-2xl font-bold text-green-300">{estadosCount.ingresado_planta}</p>
            </div>
            <TruckIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-400">Llamado Carga</p>
              <p className="text-2xl font-bold text-yellow-300">{estadosCount.llamado_carga}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-400">Cargando</p>
              <p className="text-2xl font-bold text-orange-300">{estadosCount.cargando}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-400">Listo Salir</p>
              <p className="text-2xl font-bold text-purple-300">{estadosCount.carga_finalizada}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Ha Salido</p>
              <p className="text-2xl font-bold text-gray-300">{estadosCount.egresado_planta}</p>
            </div>
            <ArrowRightOnRectangleIcon className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Tabla de Viajes */}
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-slate-100">Detalle de Vehículos Activos</h3>
          <p className="text-sm text-slate-400 mt-1">Lista completa de camiones y su estado actual</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Viaje
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Chofer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Carga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Ingreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Est. Salida
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {viajesDemo.map((viaje) => (
                <tr key={viaje.id} className="hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(viaje.estado_viaje)}`}>
                      <span className="mr-1.5">{getEstadoIcon(viaje.estado_viaje)}</span>
                      {getEstadoTexto(viaje.estado_viaje)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-100">{viaje.numero_viaje}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-100">{viaje.chofer.nombre}</div>
                    <div className="text-sm text-slate-400">DNI: {viaje.chofer.dni}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-100">{viaje.camion.patente}</div>
                    <div className="text-sm text-slate-400">{viaje.camion.marca}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-100">{viaje.producto}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-100">
                      {viaje.fecha_ingreso || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-100">
                      {viaje.hora_estimada_salida || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

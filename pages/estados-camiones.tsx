// pages/estados-camiones.tsx
// Panel de estados generales de todos los camiones

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { TruckIcon, ClockIcon, CheckCircleIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        setUser(user);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  // Datos demo simulados de diferentes estados
  const viajesDemo: ViajeEstado[] = [
    {
      id: '1',
      numero_viaje: 'VJ-2025-001',
      estado_viaje: 'ingresado_planta',
      producto: 'Soja - 35 toneladas',
      chofer: { nombre: 'Carlos Mendoza', dni: '32.456.789' },
      camion: { patente: 'ABC123', marca: 'Mercedes-Benz' },
      fecha_ingreso: '2025-10-06 08:30',
      hora_estimada_salida: '14:00'
    },
    {
      id: '2',
      numero_viaje: 'VJ-2025-002',
      estado_viaje: 'carga_finalizada',
      producto: 'Trigo - 28 toneladas',
      chofer: { nombre: 'Roberto Silva', dni: '28.123.456' },
      camion: { patente: 'XYZ789', marca: 'Scania' },
      fecha_ingreso: '2025-10-06 07:15',
      hora_estimada_salida: '13:30'
    },
    {
      id: '3',
      numero_viaje: 'VJ-2025-003',
      estado_viaje: 'cargando',
      producto: 'Maíz - 32 toneladas',
      chofer: { nombre: 'Ana García', dni: '11.223.344' },
      camion: { patente: 'DEF456', marca: 'Volvo' },
      fecha_ingreso: '2025-10-06 09:45',
      hora_estimada_salida: '15:30'
    },
    {
      id: '4',
      numero_viaje: 'VJ-2025-004',
      estado_viaje: 'confirmado',
      producto: 'Girasol - 25 toneladas',
      chofer: { nombre: 'Luis Fernández', dni: '33.444.555' },
      camion: { patente: 'GHI789', marca: 'Mercedes-Benz' },
      hora_estimada_salida: '16:00'
    },
    {
      id: '5',
      numero_viaje: 'VJ-2025-005',
      estado_viaje: 'llamado_carga',
      producto: 'Sorgo - 30 toneladas',
      chofer: { nombre: 'María López', dni: '44.555.666' },
      camion: { patente: 'JKL012', marca: 'Iveco' },
      fecha_ingreso: '2025-10-06 10:20',
      hora_estimada_salida: '16:30'
    },
    {
      id: '6',
      numero_viaje: 'VJ-2025-006',
      estado_viaje: 'egresado_planta',
      producto: 'Soja - 40 toneladas',
      chofer: { nombre: 'José Martínez', dni: '55.666.777' },
      camion: { patente: 'MNO345', marca: 'Scania' },
      fecha_ingreso: '2025-10-06 06:00',
      hora_estimada_salida: '12:00'
    }
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ingresado_planta':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'llamado_carga':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cargando':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'carga_finalizada':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'egresado_planta':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  const estadosCount = {
    confirmado: viajesDemo.filter(v => v.estado_viaje === 'confirmado').length,
    ingresado_planta: viajesDemo.filter(v => v.estado_viaje === 'ingresado_planta').length,
    llamado_carga: viajesDemo.filter(v => v.estado_viaje === 'llamado_carga').length,
    cargando: viajesDemo.filter(v => v.estado_viaje === 'cargando').length,
    carga_finalizada: viajesDemo.filter(v => v.estado_viaje === 'carga_finalizada').length,
    egresado_planta: viajesDemo.filter(v => v.estado_viaje === 'egresado_planta').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Acceso restringido. <a href="/login" className="text-blue-600 hover:text-blue-800">Iniciar sesión</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userEmail={user.email} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          pageTitle="Estados de Camiones" 
          userName={user.email.split('@')[0]} 
          userEmail={user.email}
        />
        
        <div className="flex-1 p-6 bg-[#f8f9fa]">
          {/* Header específico de la página */}
          <div className="mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <TruckIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Monitor General de Vehículos</h1>
                <p className="text-gray-600 mt-1">
                  Estados en tiempo real de todos los camiones en planta
                </p>
              </div>
            </div>
          </div>

        {/* Resumen de Estados */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Por Arribar</p>
                <p className="text-2xl font-bold text-blue-800">{estadosCount.confirmado}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">En Planta</p>
                <p className="text-2xl font-bold text-green-800">{estadosCount.ingresado_planta}</p>
              </div>
              <TruckIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Llamados</p>
                <p className="text-2xl font-bold text-yellow-800">{estadosCount.llamado_carga}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Cargando</p>
                <p className="text-2xl font-bold text-orange-800">{estadosCount.cargando}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Finalizado</p>
                <p className="text-2xl font-bold text-purple-800">{estadosCount.carga_finalizada}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Egresados</p>
                <p className="text-2xl font-bold text-gray-800">{estadosCount.egresado_planta}</p>
              </div>
              <ArrowRightOnRectangleIcon className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Lista Detallada */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Lista Completa de Viajes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Viaje
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chofer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Salida
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viajesDemo.map((viaje) => (
                  <tr key={viaje.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{viaje.numero_viaje}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(viaje.estado_viaje)}`}>
                        {getEstadoIcon(viaje.estado_viaje)}
                        <span>{viaje.estado_viaje.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{viaje.chofer.nombre}</div>
                      <div className="text-sm text-gray-500">DNI: {viaje.chofer.dni}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{viaje.camion.patente}</div>
                      <div className="text-sm text-gray-500">{viaje.camion.marca}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{viaje.producto}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {viaje.fecha_ingreso || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {viaje.hora_estimada_salida || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
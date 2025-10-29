// components/Transporte/DashboardStats.tsx
import React from 'react';
import { TruckIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface StatsProps {
  pendientes: number;
  enCurso: number;
  completadosHoy: number;
  alertas: number;
}

const DashboardStats: React.FC<StatsProps> = ({ pendientes, enCurso, completadosHoy, alertas }) => {
  const stats = [
    {
      name: 'Viajes Pendientes',
      value: pendientes,
      icon: ClockIcon,
      color: 'bg-orange-600',
      textColor: 'text-orange-400',
      bgLight: 'bg-orange-600/10'
    },
    {
      name: 'En Curso',
      value: enCurso,
      icon: TruckIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-400',
      bgLight: 'bg-blue-600/10'
    },
    {
      name: 'Completados Hoy',
      value: completadosHoy,
      icon: CheckCircleIcon,
      color: 'bg-green-600',
      textColor: 'text-green-400',
      bgLight: 'bg-green-600/10'
    },
    {
      name: 'Alertas',
      value: alertas,
      icon: ExclamationCircleIcon,
      color: 'bg-red-600',
      textColor: 'text-red-400',
      bgLight: 'bg-red-600/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-[#1b273b] rounded-lg p-6 border border-gray-800 hover:border-cyan-500/30 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${stat.bgLight} rounded-lg`}>
              <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
            </div>
            <span className="text-3xl font-bold text-white">{stat.value}</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">{stat.name}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;

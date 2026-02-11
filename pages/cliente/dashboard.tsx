// pages/cliente/dashboard.tsx
// Dashboard para rol visor/cliente
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';

export default function ClienteDashboard() {
  return (
    <AdminLayout pageTitle="Panel de Cliente">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">📦 Panel de Cliente</h1>
        <p className="text-gray-400 mb-8">Seguimiento de tus cargas y despachos</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Cargas Activas', value: '0', color: 'text-cyan-400' },
            { label: 'En Tránsito', value: '0', color: 'text-amber-400' },
            { label: 'Entregadas (Mes)', value: '0', color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1b273b] rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1b273b] rounded-lg p-8 border border-gray-800 text-center">
          <div className="text-6xl mb-4">👁️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Portal de Visibilidad</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Desde aquí podrás seguir tus cargas en tiempo real, ver estados de despachos
            y acceder al historial de entregas.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

// pages/admin/analiticas.tsx
// Stub - Analíticas de la plataforma (pendiente de implementación)
import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';

export default function AnaliticasAdmin() {
  return (
    <AdminLayout pageTitle="Analíticas">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">📊 Analíticas de la Plataforma</h1>
        <p className="text-gray-400 mb-8">Métricas de uso, actividad y rendimiento</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Usuarios Activos', value: '—', color: 'text-cyan-400' },
            { label: 'Viajes este Mes', value: '—', color: 'text-green-400' },
            { label: 'Despachos Creados', value: '—', color: 'text-blue-400' },
            { label: 'Incidencias Abiertas', value: '—', color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1b273b] rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1b273b] rounded-lg p-8 border border-gray-800 text-center">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-xl font-semibold text-white mb-2">Dashboard Analítico en Desarrollo</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Gráficos de uso, tendencias de viajes, rendimiento de flota y más 
            estarán disponibles en una próxima versión.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

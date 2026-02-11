// pages/admin/red-nodexia.tsx
// Stub - Panel de la Red Nodexia (pendiente de implementación completa)
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';

export default function RedNodxiaAdmin() {
  return (
    <AdminLayout pageTitle="Red Nodexia">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">🌐 Red Nodexia</h1>
        <p className="text-gray-400 mb-8">Gestión de la red de logística colaborativa</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Empresas en Red', value: '—', color: 'text-cyan-400' },
            { label: 'Ofertas Activas', value: '—', color: 'text-green-400' },
            { label: 'Matches este Mes', value: '—', color: 'text-purple-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1b273b] rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1b273b] rounded-lg p-8 border border-gray-800 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-white mb-2">Panel de Red en Desarrollo</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            La gestión centralizada de la Red Nodexia (empresas vinculadas, ofertas globales, 
            métricas de matching) estará disponible próximamente.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

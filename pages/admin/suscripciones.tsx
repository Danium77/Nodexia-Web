// pages/admin/suscripciones.tsx
// Stub - Gestión de suscripciones (pendiente de implementación)
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';

export default function SuscripcionesAdmin() {
  return (
    <AdminLayout pageTitle="Suscripciones">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">💳 Suscripciones</h1>
        <p className="text-gray-400 mb-8">Gestión de planes y suscripciones de empresas</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Empresas Activas', value: '—', color: 'text-green-400', bg: 'bg-green-600/10' },
            { label: 'Pruebas Gratuitas', value: '—', color: 'text-amber-400', bg: 'bg-amber-600/10' },
            { label: 'Ingresos MRR', value: '—', color: 'text-cyan-400', bg: 'bg-cyan-600/10' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1b273b] rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1b273b] rounded-lg p-8 border border-gray-800 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-xl font-semibold text-white mb-2">Módulo en Desarrollo</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            La gestión de suscripciones y facturación estará disponible próximamente.
            Actualmente todas las empresas operan en modo de prueba.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

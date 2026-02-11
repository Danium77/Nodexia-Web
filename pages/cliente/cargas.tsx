// pages/cliente/cargas.tsx
// Listado de cargas del cliente/visor
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';

export default function ClienteCargas() {
  return (
    <AdminLayout pageTitle="Mis Cargas">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">🚛 Mis Cargas</h1>
        <p className="text-gray-400 mb-8">Seguimiento de despachos y entregas</p>

        <div className="bg-[#1b273b] rounded-lg p-8 border border-gray-800 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-white mb-2">Sin cargas activas</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Cuando tengas despachos asignados, podrás ver su estado y 
            seguimiento en tiempo real desde aquí.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

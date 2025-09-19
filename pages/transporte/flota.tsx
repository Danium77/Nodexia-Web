import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import FlotaGestion from '../../components/Dashboard/FlotaGestion';

export default function FlotaTransporte() {
  return (
    <AdminLayout pageTitle="Gestión de Flota">
      <div className="w-full bg-gray-800 rounded-lg shadow-md p-8 mt-8">
        <h2 className="text-2xl font-bold text-green-400 mb-6">Flota</h2>
        <FlotaGestion />
      </div>
    </AdminLayout>
  );
}

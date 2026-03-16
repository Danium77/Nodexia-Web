import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GestionFunciones from '@/components/Admin/GestionFunciones';

export default function FuncionesAdmin() {
  return (
    <AdminLayout pageTitle="Funciones del Sistema">
      <GestionFunciones />
    </AdminLayout>
  );
}

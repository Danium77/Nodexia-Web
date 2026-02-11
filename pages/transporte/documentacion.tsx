// pages/transporte/documentacion.tsx
// Página de documentación de flota - usa DocumentosFlotaContent (sistema nuevo)
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import DocumentosFlotaContent from '../../components/Transporte/DocumentosFlotaContent';

export default function DocumentacionTransporte() {
  return (
    <AdminLayout pageTitle="Documentación de Flota">
      <DocumentosFlotaContent />
    </AdminLayout>
  );
}

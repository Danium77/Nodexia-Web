// pages/documentos.tsx
// Documentación para rol administrativo — muestra docs de la empresa
import React from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import DocumentosFlotaContent from '../components/Transporte/DocumentosFlotaContent';

export default function DocumentosPage() {
  return (
    <AdminLayout pageTitle="Documentación">
      <DocumentosFlotaContent />
    </AdminLayout>
  );
}

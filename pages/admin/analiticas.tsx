// pages/admin/analiticas.tsx
import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ReporteDashboard from '@/components/Dashboard/ReporteDashboard';

export default function AnaliticasAdmin() {
  return (
    <AdminLayout pageTitle="Analíticas">
      <div className="max-w-7xl mx-auto">
        <ReporteDashboard />
      </div>
    </AdminLayout>
  );
}

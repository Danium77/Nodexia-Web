// pages/admin/index.tsx
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import DashboardNodexia from '../../components/Admin/DashboardNodexia';

const AdminDashboardPage = () => {
    return (
        <AdminLayout pageTitle="">
            <DashboardNodexia />
        </AdminLayout>
    );
};

export default AdminDashboardPage;

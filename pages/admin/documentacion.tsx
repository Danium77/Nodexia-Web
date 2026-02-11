// pages/admin/documentacion.tsx
// Panel de validación de documentos para admin Nodexia (TASK-S04)

import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import Sidebar from '../../components/layout/Sidebar';
import DocumentacionAdmin from '../../components/Admin/DocumentacionAdmin';

export default function DocumentacionAdminPage() {
  const router = useRouter();
  const { user, primaryRole, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && primaryRole !== 'super_admin' && primaryRole !== 'admin_nodexia') {
      router.push('/dashboard');
    }
  }, [user, primaryRole, loading, router]);

  if (loading || (primaryRole !== 'super_admin' && primaryRole !== 'admin_nodexia')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <DocumentacionAdmin />
      </div>
    </div>
  );
}

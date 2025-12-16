import React from 'react';
import { NextPage } from 'next';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import TestInteraccionUsuarios from '../components/Testing/TestInteraccionUsuarios';
import AdminLayout from '../components/layout/AdminLayout';

const TestEmpresasPage: NextPage = () => {
  const { hasRole, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Solo permitir acceso a admins y coordinadores para testing
  if (!hasRole('admin') && !hasRole('coordinador')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página de pruebas.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout pageTitle="Test Empresas">
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Test de Empresas y Usuarios
              </h1>
              <p className="mt-2 text-gray-600">
                Interfaz para probar la interacción entre usuarios, roles y empresas
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Modo de Pruebas:</strong> Esta página permite simular diferentes usuarios y probar las interacciones entre empresas. 
                  Asegúrate de haber ejecutado los scripts SQL de configuración primero.
                </p>
              </div>
            </div>
          </div>

          <TestInteraccionUsuarios />
        </div>
      </div>
    </AdminLayout>
  );
};

export default TestEmpresasPage;
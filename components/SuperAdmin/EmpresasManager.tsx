import React from 'react';
import { useEmpresasAdmin } from '../../lib/hooks/useSuperAdmin';

const EmpresasManager: React.FC = () => {
  const { empresas, loading, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresasAdmin();

  if (loading) {
    return <div className="text-white">Cargando empresas...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Empresas</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          Nueva Empresa
        </button>
      </div>

      <div className="bg-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-600">
            <tr>
              <th className="text-left p-4 text-white">Nombre</th>
              <th className="text-left p-4 text-white">CUIT</th>
              <th className="text-left p-4 text-white">Email</th>
              <th className="text-left p-4 text-white">Estado</th>
              <th className="text-left p-4 text-white">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-gray-400">
                  No hay empresas registradas
                </td>
              </tr>
            ) : (
              empresas.map((empresa) => (
                <tr key={empresa.id} className="border-t border-gray-600">
                  <td className="p-4 text-white">{empresa.nombre}</td>
                  <td className="p-4 text-gray-300">{empresa.cuit}</td>
                  <td className="p-4 text-gray-300">{empresa.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      empresa.activa ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {empresa.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-blue-400 hover:text-blue-300 mr-3">
                      Editar
                    </button>
                    <button className="text-red-400 hover:text-red-300">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmpresasManager;
import React, { useState } from 'react';

export default function GestionEmpresasSimple() {
  const [mensaje, setMensaje] = useState('Sistema funcionando correctamente');

  const crearEmpresaDemo = () => {
    setMensaje('🎉 ¡Funcionalidad de crear empresa lista! (Demo)');
  };

  const asignarUsuarioDemo = () => {
    setMensaje('👤 ¡Funcionalidad de asignar usuario lista! (Demo)');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🏢 Gestión de Empresas - Producción
        </h1>
        
        <div className="mb-6 p-4 bg-green-100 rounded-lg">
          <p className="text-green-800 font-medium">{mensaje}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">📋 Planes Disponibles</h3>
            <p className="text-2xl font-bold text-blue-600">3</p>
            <ul className="text-sm text-blue-700 mt-2">
              <li>• Básico ($99.99/mes)</li>
              <li>• Profesional ($199.99/mes)</li>
              <li>• Empresarial ($399.99/mes)</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">🏭 Tipos de Empresa</h3>
            <p className="text-2xl font-bold text-green-600">3</p>
            <ul className="text-sm text-green-700 mt-2">
              <li>• Planta (Producción)</li>
              <li>• Transporte (Logística)</li>
              <li>• Cliente (Recepción)</li>
            </ul>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">👤 Roles por Tipo</h3>
            <p className="text-2xl font-bold text-purple-600">9</p>
            <ul className="text-sm text-purple-700 mt-2">
              <li>• Gerentes (3)</li>
              <li>• Coordinadores (3)</li>
              <li>• Operadores (3)</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">🎯 Flujo de Producción Real</h2>
          <p className="text-yellow-700">
            Esta interfaz permite crear empresas con planes de suscripción específicos y asignar usuarios con roles del ecosistema Nodexia (Planta-Transporte-Cliente).
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={crearEmpresaDemo}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            ➕ Nueva Empresa
          </button>
          <button
            onClick={asignarUsuarioDemo}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
          >
            👤 Asignar Usuario
          </button>
          <button
            onClick={() => setMensaje('🔄 Sistema recargado')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
          >
            ♻️ Recargar
          </button>
        </div>

        {/* Formulario Demo para Crear Empresa */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">➕ Crear Nueva Empresa (Demo)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                placeholder="Acme Transporte SA"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CUIT *</label>
              <input
                type="text"
                placeholder="30-12345678-9"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                placeholder="contacto@acmetransporte.com"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="text"
                placeholder="+54 11 4567-8901"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Plan de Suscripción</label>
              <select className="w-full p-2 border rounded" disabled>
                <option>Profesional - $199.99/mes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo en Ecosistema</label>
              <select className="w-full p-2 border rounded" disabled>
                <option>Transporte - Empresa de transporte que ejecuta los despachos</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setMensaje('✅ Empresa "Acme Transporte SA" creada exitosamente con plan Profesional')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Crear Empresa (Demo)
            </button>
          </div>
        </div>

        {/* Formulario Demo para Asignar Usuario */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">👤 Asignar Usuario a Empresa (Demo)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Empresa *</label>
              <select className="w-full p-2 border rounded" disabled>
                <option>Acme Transporte SA (Transporte)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email del Usuario *</label>
              <input
                type="email"
                placeholder="carlos.manager@acmetransporte.com"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
              <input
                type="text"
                placeholder="Carlos Rodríguez"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Departamento</label>
              <input
                type="text"
                placeholder="Operaciones"
                className="w-full p-2 border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rol en la Empresa *</label>
              <select className="w-full p-2 border rounded" disabled>
                <option>Gerente de Flota - Gestiona toda la flota y operaciones</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setMensaje('✅ Usuario "Carlos Rodríguez" asignado como "Gerente de Flota" a "Acme Transporte SA"')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Asignar Usuario (Demo)
            </button>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">ℹ️ Estado del Sistema</h2>
          <div className="text-sm text-blue-700 space-y-1">
            <p>✅ <strong>Base de datos:</strong> Estructuras creadas (planes, tipos de empresa, roles)</p>
            <p>✅ <strong>Interfaz:</strong> Formularios de creación y asignación listos</p>
            <p>✅ <strong>Funciones:</strong> crear_empresa_completa() y asignar_usuario_empresa() disponibles</p>
            <p>🔄 <strong>Próximo paso:</strong> Conectar con base de datos real</p>
          </div>
        </div>
      </div>
    </div>
  );
}
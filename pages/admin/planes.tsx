// pages/admin/planes.tsx
// Gestión de planes de suscripción — Admin Nodexia
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { CheckIcon } from '@heroicons/react/24/outline';

const PLANES = [
  {
    nombre: 'Starter',
    precio: 'Gratis',
    color: 'border-gray-600',
    badge: 'bg-gray-700 text-gray-300',
    features: ['1 empresa', '5 usuarios', '10 viajes/mes', 'Soporte email'],
    empresas: 0,
  },
  {
    nombre: 'Profesional',
    precio: '$49.990/mes',
    color: 'border-cyan-600',
    badge: 'bg-cyan-900/50 text-cyan-400',
    features: ['1 empresa', '25 usuarios', 'Viajes ilimitados', 'GPS tracking', 'Soporte prioritario'],
    destacado: true,
    empresas: 0,
  },
  {
    nombre: 'Enterprise',
    precio: 'Personalizado',
    color: 'border-purple-600',
    badge: 'bg-purple-900/50 text-purple-400',
    features: ['Multi-empresa', 'Usuarios ilimitados', 'Viajes ilimitados', 'API access', 'Red Nodexia', 'Soporte dedicado'],
    empresas: 0,
  },
];

export default function PlanesAdmin() {
  return (
    <AdminLayout pageTitle="Planes de Suscripción">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Planes Disponibles</h2>
        <p className="text-gray-400 text-sm">Configuración de planes y límites de suscripción</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANES.map(plan => (
          <div key={plan.nombre}
            className={`bg-[#1b273b] rounded-xl p-6 border-2 ${plan.color} ${plan.destacado ? 'ring-1 ring-cyan-500/30' : ''} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${plan.badge}`}>
                {plan.empresas} empresas
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-400 mb-6">{plan.precio}</p>
            <ul className="space-y-2.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-6 w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-700/50 text-gray-500 cursor-not-allowed"
            >
              Editar Plan (próximamente)
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[#1b273b] rounded-lg p-6 border border-gray-800">
        <h3 className="text-white font-semibold mb-2">📊 Métricas de Suscripciones</h3>
        <p className="text-gray-400 text-sm">La gestión automática de suscripciones y facturación se habilitará en una próxima actualización. Por ahora, los planes se gestionan manualmente desde la base de datos.</p>
      </div>
    </AdminLayout>
  );
}

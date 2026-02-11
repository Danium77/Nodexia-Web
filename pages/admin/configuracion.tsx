// pages/admin/configuracion.tsx
// Configuración del sistema — Admin Nodexia
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  Cog6ToothIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ServerIcon,
  PaintBrushIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const SECCIONES = [
  {
    titulo: 'General',
    icon: Cog6ToothIcon,
    descripcion: 'Nombre del sistema, logo, timezone',
    items: [
      { label: 'Nombre del sistema', value: 'Nodexia' },
      { label: 'Versión', value: 'MVP 1.0' },
      { label: 'Timezone', value: 'America/Argentina/Buenos_Aires' },
    ],
  },
  {
    titulo: 'Email / SMTP',
    icon: EnvelopeIcon,
    descripcion: 'Configuración de correo para notificaciones',
    items: [
      { label: 'Proveedor', value: 'Supabase Auth (integrado)' },
      { label: 'Email remitente', value: 'noreply@nodexia.com' },
      { label: 'Estado', value: '✅ Configurado' },
    ],
  },
  {
    titulo: 'Seguridad',
    icon: ShieldCheckIcon,
    descripcion: 'Autenticación, RLS, políticas',
    items: [
      { label: 'Autenticación', value: 'Supabase Auth (email/password)' },
      { label: 'RLS', value: 'Habilitado en todas las tablas' },
      { label: 'Sesión máxima', value: '24 horas' },
    ],
  },
  {
    titulo: 'Almacenamiento',
    icon: ServerIcon,
    descripcion: 'Buckets de storage y límites',
    items: [
      { label: 'Bucket docs entidades', value: 'documentacion-entidades (privado)' },
      { label: 'Bucket docs viajes', value: 'documentacion-viajes (privado)' },
      { label: 'Tamaño máximo', value: '10 MB por archivo' },
      { label: 'Formatos permitidos', value: 'PDF, JPG, PNG' },
    ],
  },
  {
    titulo: 'Notificaciones',
    icon: BellIcon,
    descripcion: 'Push notifications y alertas',
    items: [
      { label: 'Push notifications', value: 'Firebase Cloud Messaging' },
      { label: 'Estado', value: '⚠️ Configuración parcial' },
    ],
  },
  {
    titulo: 'Apariencia',
    icon: PaintBrushIcon,
    descripcion: 'Tema y personalización visual',
    items: [
      { label: 'Tema', value: 'Dark (Nodexia Default)' },
      { label: 'Color primario', value: 'Cyan (#06B6D4)' },
    ],
  },
];

export default function ConfiguracionAdmin() {
  return (
    <AdminLayout pageTitle="Configuración">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Configuración del Sistema</h2>
        <p className="text-gray-400 text-sm">Parámetros generales y ajustes de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SECCIONES.map(seccion => (
          <div key={seccion.titulo} className="bg-[#1b273b] rounded-lg border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50 flex items-center gap-3">
              <seccion.icon className="h-5 w-5 text-cyan-400" />
              <div>
                <h3 className="text-white font-semibold text-sm">{seccion.titulo}</h3>
                <p className="text-gray-500 text-xs">{seccion.descripcion}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {seccion.items.map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className="text-white text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-amber-900/10 border border-amber-800/30 rounded-lg p-4">
        <p className="text-amber-400 text-sm">
          ⚠️ La edición de configuración desde la UI se habilitará en una próxima versión. Actualmente los parámetros se gestionan desde variables de entorno y la base de datos.
        </p>
      </div>
    </AdminLayout>
  );
}

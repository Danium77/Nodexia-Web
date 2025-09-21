import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/layout/AdminLayout';
import FormCard from '../../../components/ui/FormCard';
import { supabase } from '../../../lib/supabaseClient';

interface ClienteRow {
  id: string;
  nombre?: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  ubicacion?: string;
  telefono?: string;
  documentacion?: string[];
  id_transporte?: string | null;
}

const ClienteDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [cliente, setCliente] = useState<ClienteRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  const fetchCliente = async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from<ClienteRow>('clientes')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      setCliente(data || null);
    } catch (err: unknown) {
      console.error('Error fetch cliente', err);
      setMensaje('Error cargando cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    fetchCliente(id);
    
    // Detectar el rol del usuario para decidir dónde volver
    const detectUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profile_users')
            .select('roles(name)')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.roles) {
            const rolesRaw: any = profile.roles;
            const userRoles = Array.isArray(rolesRaw)
              ? rolesRaw.map((r: any) => r.name)
              : [rolesRaw.name];
            
            // Si tiene rol transporte, usar 'transporte', sino usar el primer rol
            setUserRole(userRoles.includes('transporte') ? 'transporte' : userRoles[0] || '');
          }
        }
      } catch (error) {
        console.error('Error detecting user role:', error);
      }
    };
    
    detectUserRole();
  }, [id]);

  const handleSave = async () => {
    if (!cliente) return;
    setSaving(true);
    setMensaje(null);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: cliente.nombre,
          direccion: cliente.direccion,
          localidad: cliente.localidad,
          provincia: cliente.provincia,
          telefono: cliente.telefono,
        })
        .eq('id', cliente.id);
      if (error) throw error;
      setMensaje('Cliente actualizado correctamente.');
      // refetch
      fetchCliente(cliente.id);
    } catch (err: unknown) {
      console.error('Error guardando cliente', err);
      setMensaje('Error al guardar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDesasociar = async () => {
    if (!cliente) return;
    setSaving(true);
    setMensaje(null);
    try {
      // Si la tabla clientes tiene campo id_transporte, lo seteamos a null para desasociar
      const { error } = await supabase
        .from('clientes')
        .update({ id_transporte: null })
        .eq('id', cliente.id);
      if (error) throw error;
      setMensaje('Cliente desasociado correctamente.');
      // volver según el rol del usuario
      const backUrl = userRole === 'transporte' ? '/transporte/configuracion' : '/configuracion/clientes';
      router.push(backUrl);
    } catch (err: unknown) {
      console.error('Error desasociando cliente', err);
      setMensaje('Error al desasociar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleVolver = () => {
    const backUrl = userRole === 'transporte' ? '/transporte/configuracion' : '/configuracion/clientes';
    router.push(backUrl);
  };

  return (
    <AdminLayout pageTitle={`Cliente ${id}`}>
      <FormCard>
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Gestión de Cliente</h2>
        {loading ? (
          <div className="text-gray-300">Cargando...</div>
        ) : cliente ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-gray-300 mb-1">Nombre</label>
              <input className="rounded p-2 bg-gray-900 text-white" value={cliente.nombre || ''} onChange={e => setCliente({ ...cliente, nombre: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-300 mb-1">CUIT</label>
              <input className="rounded p-2 bg-gray-900 text-white" value={cliente.cuit || ''} readOnly />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-300 mb-1">Dirección</label>
              <input className="rounded p-2 bg-gray-900 text-white" value={cliente.direccion || ''} onChange={e => setCliente({ ...cliente, direccion: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-300 mb-1">Localidad</label>
              <input className="rounded p-2 bg-gray-900 text-white" value={cliente.localidad || ''} onChange={e => setCliente({ ...cliente, localidad: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-300 mb-1">Provincia</label>
              <input className="rounded p-2 bg-gray-900 text-white" value={cliente.provincia || ''} onChange={e => setCliente({ ...cliente, provincia: e.target.value })} />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-300 mb-1">Teléfono</label>
              <input className="rounded p-2 bg-gray-900 text-white" value={cliente.telefono || ''} onChange={e => setCliente({ ...cliente, telefono: e.target.value })} />
            </div>
            <div className="col-span-1 md:col-span-2 mt-4 flex gap-2">
              <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded" onClick={handleVolver}>Volver</button>
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded" onClick={handleDesasociar} disabled={saving}>{saving ? 'Procesando...' : 'Desasociar'}</button>
            </div>
            {mensaje && <div className="col-span-1 md:col-span-2 text-yellow-300">{mensaje}</div>}
          </div>
        ) : (
          <div className="text-gray-300">Cliente no encontrado.</div>
        )}
      </FormCard>
    </AdminLayout>
  );
};

export default ClienteDetail;

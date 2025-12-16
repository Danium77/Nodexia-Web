import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layout/AdminLayout';
import FormCard from '../../components/ui/FormCard';
import { supabase } from '../../lib/supabaseClient';

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion: string;
  telefono: string;
  documentacion: string[];
}

const ClientesPage = () => {
  const router = useRouter();
  const [filtro, setFiltro] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cuitInput, setCuitInput] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState<Cliente | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar clientes asociados al coordinador
  useEffect(() => {
    cargarClientesAsociados();
  }, []);

  const cargarClientesAsociados = async () => {
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener la empresa del usuario coordinador
      const { data: usuarioEmpresa, error: userError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (userError || !usuarioEmpresa) {
        console.error('Error al obtener empresa del usuario:', userError);
        return;
      }

      // Obtener clientes asociados (empresas tipo coordinador que son clientes)
      const { data: relaciones, error: relacionesError } = await supabase
        .from('relaciones_empresa')
        .select(`
          empresa_relacionada:empresas!empresa_transporte_id(
            id,
            nombre,
            cuit,
            direccion,
            localidad,
            provincia,
            telefono,
            configuracion_empresa
          )
        `)
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('estado', 'activa')
        .eq('activo', true);

      if (relacionesError) {
        console.error('Error al cargar clientes asociados:', relacionesError);
        return;
      }

      // Filtrar solo las empresas que son clientes (por configuración)
      const clientesAsociados = (relaciones || [])
        .map(relacion => relacion.empresa_relacionada)
        .filter(Boolean)
        .filter((empresa: any) => {
          // Filtrar solo clientes por configuración específica
          return empresa.configuracion_empresa?.tipo_instalacion === 'cliente';
        })
        .map((empresa: any) => ({
          id: empresa.id,
          nombre: empresa.nombre,
          cuit: empresa.cuit || '',
          direccion: empresa.direccion || '',
          localidad: empresa.localidad || '',
          provincia: empresa.provincia || '',
          ubicacion: `${empresa.localidad || ''}, ${empresa.provincia || ''}`.replace(/^, |, $/, ''),
          telefono: empresa.telefono || '',
          documentacion: [] // Por ahora array vacío, se puede expandir luego
        }));

      console.log('Clientes asociados cargados:', clientesAsociados);
      setClientes(clientesAsociados);

    } catch (error) {
      console.error('Error al cargar clientes asociados:', error);
    }
  };

  // Buscar cliente por CUIT en la red Nodexia
  const buscarClientePorCuit = async () => {
    setMensaje('');
    setNuevoCliente(null);
    setLoading(true);
    
    try {
      if (!cuitInput.trim()) {
        setMensaje('Ingrese un CUIT válido');
        return;
      }

      // Buscar empresa tipo coordinador con configuración de cliente (búsqueda flexible)
      const cuitLimpio = cuitInput.trim();
      
      const { data: clienteEncontrado, error } = await supabase
        .from('empresas')
        .select('*')
        .or(`cuit.eq.${cuitLimpio},cuit.like.${cuitLimpio}%`)
        .eq('tipo_empresa', 'coordinador')
        .single();

      if (error || !clienteEncontrado) {
        setMensaje('El cliente no existe en la red Nodexia. Debe registrarse antes de poder asociarlo.');
        return;
      }

      // Verificar que sea efectivamente un cliente
      const esCliente = clienteEncontrado.configuracion_empresa?.tipo_instalacion === 'cliente';
      
      if (!esCliente) {
        setMensaje('La empresa encontrada no es un cliente.');
        return;
      }

      // Verificar si ya está asociado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (!usuarioEmpresa) {
        setMensaje('Error: No se pudo obtener la empresa del usuario');
        return;
      }

      const { data: relacionExiste } = await supabase
        .from('relaciones_empresa')
        .select('id')
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('empresa_transporte_id', clienteEncontrado.id)
        .eq('estado', 'activa')
        .single();

      if (relacionExiste) {
        setMensaje('Este cliente ya está asociado a tu empresa.');
        return;
      }

      // Configurar cliente encontrado
      setNuevoCliente({
        id: clienteEncontrado.id,
        nombre: clienteEncontrado.nombre,
        cuit: clienteEncontrado.cuit || '',
        direccion: clienteEncontrado.direccion || '',
        localidad: clienteEncontrado.localidad || '',
        provincia: clienteEncontrado.provincia || '',
        ubicacion: `${clienteEncontrado.localidad || ''}, ${clienteEncontrado.provincia || ''}`.replace(/^, |, $/, ''),
        telefono: clienteEncontrado.telefono || '',
        documentacion: []
      });

      setMensaje('Cliente encontrado. Puede proceder a asociarlo.');

    } catch (error) {
      console.error('Error buscando cliente:', error);
      setMensaje('Error al buscar el cliente. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Asociar cliente existente
  const asociarCliente = async () => {
    if (!nuevoCliente) return;
    
    try {
      setLoading(true);
      
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMensaje('Error: Usuario no autenticado');
        return;
      }

      // Obtener la empresa del usuario coordinador
      const { data: usuarioEmpresa, error: userError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (userError || !usuarioEmpresa) {
        setMensaje('Error: No se pudo obtener la empresa del usuario');
        return;
      }

      // Crear la relación
      const { error: relacionError } = await supabase
        .from('relaciones_empresa')
        .insert({
          empresa_coordinadora_id: usuarioEmpresa.empresa_id,
          empresa_transporte_id: nuevoCliente.id,
          estado: 'activa',
          fecha_inicio: new Date().toISOString().split('T')[0],
          activo: true
        })
        .select()
        .single();

      if (relacionError) {
        setMensaje('Error al crear la relación: ' + relacionError.message);
        return;
      }

      setMensaje('Cliente asociado correctamente.');
      // Recargar la lista de clientes asociados
      await cargarClientesAsociados();
      setNuevoCliente(null);
      setCuitInput('');

    } catch (error) {
      console.error('Error al asociar cliente:', error);
      setMensaje('Error inesperado al asociar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestión de Clientes">
      <button
        className="mb-6 flex items-center text-yellow-400 hover:text-yellow-200 font-semibold"
        onClick={() => router.push('/configuracion')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Volver
      </button>
      <FormCard className="mb-2">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Clientes</h2>
        <div className="mb-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-300 mb-1">Filtrar por nombre o CUIT</label>
            <input
              type="text"
              className="w-full rounded px-3 py-2 bg-gray-900 text-white"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar..."
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-300 mb-1">Agregar cliente por CUIT</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="rounded px-3 py-2 bg-gray-900 text-white flex-1"
                value={cuitInput}
                onChange={e => setCuitInput(e.target.value)}
                placeholder="CUIT"
                maxLength={11}
              />
              <button
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                onClick={buscarClientePorCuit}
                disabled={loading || !cuitInput.trim()}
              >Buscar</button>
            </div>
          </div>
        </div>
        {mensaje && <div className="my-2 text-yellow-400">{mensaje}</div>}
        {nuevoCliente && (
          <div className="bg-gray-900 rounded p-4 mt-4">
            <h3 className="text-lg font-bold text-yellow-300 mb-2">Datos del cliente encontrado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white">
              <div><strong>Nombre:</strong> {nuevoCliente.nombre}</div>
              <div><strong>CUIT:</strong> {nuevoCliente.cuit}</div>
              <div><strong>Dirección:</strong> {nuevoCliente.direccion}</div>
              <div><strong>Localidad:</strong> {nuevoCliente.localidad}</div>
              <div><strong>Provincia:</strong> {nuevoCliente.provincia}</div>
              <div><strong>Ubicación:</strong> {nuevoCliente.ubicacion}</div>
              <div><strong>Teléfono:</strong> {nuevoCliente.telefono}</div>
              <div className="col-span-2"><strong>Documentación:</strong> {nuevoCliente.documentacion?.length > 0 ? nuevoCliente.documentacion.join(', ') : 'Sin documentación'}</div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                onClick={asociarCliente}
              >Asociar a mi lista</button>
            </div>
          </div>
        )}
      </FormCard>
      <FormCard>
        <h3 className="text-xl font-bold text-yellow-300 mb-4">Mis clientes asociados</h3>
        {clientes.length === 0 ? (
          <div className="text-gray-400">No tienes clientes asociados aún.</div>
        ) : (
          <table className="w-full text-white">
            <thead>
              <tr className="bg-gray-900">
                <th className="p-2">Nombre</th>
                <th className="p-2">CUIT</th>
                <th className="p-2">Dirección</th>
                <th className="p-2">Localidad</th>
                <th className="p-2">Provincia</th>
                <th className="p-2">Teléfono</th>
                <th className="p-2">Documentación</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.filter(c =>
                c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                c.cuit.includes(filtro)
              ).map(c => (
                <tr key={c.id} className="border-b border-gray-700">
                  <td className="p-2">{c.nombre}</td>
                  <td className="p-2">{c.cuit}</td>
                  <td className="p-2">{c.direccion}</td>
                  <td className="p-2">{c.localidad}</td>
                  <td className="p-2">{c.provincia}</td>
                  <td className="p-2">{c.telefono}</td>
                  <td className="p-2">{c.documentacion?.length > 0 ? c.documentacion.join(', ') : 'Sin documentación'}</td>
                  <td className="p-2">
                    <button
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
                      onClick={() => router.push(`/configuracion/clientes/${c.id}`)}
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {clientes.length === 0 && (
          <div className="mt-3 text-gray-400">Prueba a buscar un CUIT que termine en '3' en la sección "Agregar cliente por CUIT" y luego pulsa "Asociar a mi lista" para que aparezca el botón "Gestionar".</div>
        )}
  </FormCard>
    </AdminLayout>
  );
};

export default ClientesPage;

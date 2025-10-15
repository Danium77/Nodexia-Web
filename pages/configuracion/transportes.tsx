
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface Transporte {
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

const TransportesPage = () => {
  const router = useRouter();
  const [filtro, setFiltro] = useState('');
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [cuitInput, setCuitInput] = useState('');
  const [nuevoTransporte, setNuevoTransporte] = useState<Transporte | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar transportes asociados al coordinador
  useEffect(() => {
    cargarTransportesAsociados();
  }, []);

  const cargarTransportesAsociados = async () => {
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

      // Obtener transportes asociados a través de relaciones activas
      const { data: relaciones, error: relacionesError } = await supabase
        .from('relaciones_empresa')
        .select(`
          empresa_transporte:empresas!empresa_transporte_id(
            id,
            nombre,
            cuit,
            direccion,
            localidad,
            provincia,
            telefono,
            tipo_empresa,
            configuracion_empresa
          )
        `)
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('estado', 'activa')
        .eq('activo', true);

      if (relacionesError) {
        console.error('Error al cargar transportes asociados:', relacionesError);
        return;
      }

      // Mapear los datos de las empresas de transporte SOLO
      const transportesAsociados = (relaciones || [])
        .map(relacion => relacion.empresa_transporte)
        .filter(Boolean)
        .filter(empresa => {
          // Solo incluir empresas que sean realmente transportes
          return empresa.tipo_empresa === 'transporte';
        })
        .map(empresa => ({
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

      console.log('Transportes asociados cargados:', transportesAsociados);
      setTransportes(transportesAsociados);

    } catch (error) {
      console.error('Error al cargar transportes asociados:', error);
    }
  };

  // Buscar transporte por CUIT en la red Nodexia
  const buscarTransportePorCuit = async () => {
    setMensaje('');
    setNuevoTransporte(null);
    setLoading(true);
    // TODO: Reemplazar por consulta real a la red Nodexia
    // Simulación: si el CUIT termina en 1, existe; si no, no existe
    if (cuitInput.trim().endsWith('1')) {
      setNuevoTransporte({
        id: 'demo-id',
        nombre: 'Transporte Demo S.A.',
        cuit: cuitInput.trim(),
        direccion: 'Calle Falsa 123',
        localidad: 'Ciudad Demo',
        provincia: 'Provincia Demo',
        ubicacion: 'Lat: -34.6, Lng: -58.4',
        telefono: '011-1234-5678',
        documentacion: ['ARCA.pdf', 'InscripcionFiscal.pdf'],
      });
    } else {
      setMensaje('El transporte no existe en la red Nodexia. Debe registrarse antes de poder asociarlo.');
    }
    setLoading(false);
  };

  // Asociar transporte existente
  const asociarTransporte = async () => {
    if (!nuevoTransporte) return;
    
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

      // Buscar la empresa de transporte por CUIT
      const { data: empresaTransporte, error: transporteError } = await supabase
        .from('empresas')
        .select('id')
        .eq('cuit', nuevoTransporte.cuit)
        .eq('tipo_empresa', 'transporte')
        .single();

      if (transporteError || !empresaTransporte) {
        setMensaje('Error: No se encontró la empresa de transporte en la base de datos');
        return;
      }

      // Crear la relación (reutilizar la lógica del hook useNetwork)
      const { data: relacionCreada, error: relacionError } = await supabase
        .from('relaciones_empresa')
        .insert({
          empresa_coordinadora_id: usuarioEmpresa.empresa_id,
          empresa_transporte_id: empresaTransporte.id,
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

      setMensaje('Transporte asociado correctamente.');
      // Recargar la lista de transportes asociados
      await cargarTransportesAsociados();
      setNuevoTransporte(null);
      setCuitInput('');

    } catch (error) {
      console.error('Error al asociar transporte:', error);
      setMensaje('Error inesperado al asociar el transporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestión de Transportes">
      <button
        className="mb-6 flex items-center text-cyan-400 hover:text-cyan-200 font-semibold"
        onClick={() => router.push('/configuracion')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Volver
      </button>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Transportes</h2>
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
            <label className="block text-gray-300 mb-1">Agregar transporte por CUIT</label>
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
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded"
                onClick={buscarTransportePorCuit}
                disabled={loading || !cuitInput.trim()}
              >Buscar</button>
            </div>
          </div>
        </div>
        {mensaje && <div className="my-2 text-yellow-400">{mensaje}</div>}
        {nuevoTransporte && (
          <div className="bg-gray-900 rounded p-4 mt-4">
            <h3 className="text-lg font-bold text-cyan-300 mb-2">Datos del transporte encontrado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white">
              <div><strong>Nombre:</strong> {nuevoTransporte.nombre}</div>
              <div><strong>CUIT:</strong> {nuevoTransporte.cuit}</div>
              <div><strong>Dirección:</strong> {nuevoTransporte.direccion}</div>
              <div><strong>Localidad:</strong> {nuevoTransporte.localidad}</div>
              <div><strong>Provincia:</strong> {nuevoTransporte.provincia}</div>
              <div><strong>Ubicación:</strong> {nuevoTransporte.ubicacion}</div>
              <div><strong>Teléfono:</strong> {nuevoTransporte.telefono}</div>
              <div className="col-span-2"><strong>Documentación:</strong> {nuevoTransporte.documentacion.join(', ')}</div>
            </div>
            <button
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              onClick={asociarTransporte}
            >Asociar a mi lista</button>
          </div>
        )}
      </div>
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Mis transportes asociados</h3>
        {transportes.length === 0 ? (
          <div className="text-gray-400">No tienes transportes asociados aún.</div>
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
              {transportes.filter(t =>
                t.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                t.cuit.includes(filtro)
              ).map(t => (
                <tr key={t.id} className="border-b border-gray-700">
                  <td className="p-2">{t.nombre}</td>
                  <td className="p-2">{t.cuit}</td>
                  <td className="p-2">{t.direccion}</td>
                  <td className="p-2">{t.localidad}</td>
                  <td className="p-2">{t.provincia}</td>
                  <td className="p-2">{t.telefono}</td>
                  <td className="p-2">{t.documentacion?.length > 0 ? t.documentacion.join(', ') : 'Sin documentación'}</td>
                  <td className="p-2">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      onClick={() => router.push(`/configuracion/transportes/${t.id}`)}
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default TransportesPage;

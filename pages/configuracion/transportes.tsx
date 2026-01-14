
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
        .from('relaciones_empresas')
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
        .eq('empresa_cliente_id', usuarioEmpresa.empresa_id)
        .eq('estado', 'activa');

      if (relacionesError) {
        console.error('Error al cargar transportes asociados:', relacionesError);
        return;
      }

      // Mapear los datos de las empresas de transporte SOLO
      const transportesAsociados = (relaciones || [])
        .map((relacion: any) => relacion.empresa_transporte)
        .filter(Boolean)
        .filter((empresa: any) => {
          // Solo incluir empresas que sean realmente transportes
          return empresa.tipo_empresa === 'transporte';
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
    
    try {
      // Normalizar CUIT: quitar guiones y espacios
      const cuitNormalizado = cuitInput.trim().replace(/[-\s]/g, '');
      
      if (cuitNormalizado.length !== 11) {
        setMensaje('El CUIT debe tener 11 dígitos');
        setLoading(false);
        return;
      }

      console.log('🔍 Buscando transporte con CUIT:', cuitNormalizado);
      console.log('📋 Query parameters:', {
        tipo_empresa: 'transporte',
        cuit_normalizado: cuitNormalizado,
        cuit_original: cuitInput.trim(),
        activo: true
      });

      // Buscar en la tabla empresas - SIN .single() para ver todos los resultados
      const { data: empresasEncontradas, error: busquedaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('tipo_empresa', 'transporte')
        .or(`cuit.eq.${cuitNormalizado},cuit.eq.${cuitInput.trim()}`)
        .eq('activo', true);

      console.log('📦 Resultado búsqueda:', {
        cantidad: empresasEncontradas?.length || 0,
        error: busquedaError,
        empresas: empresasEncontradas
      });

      if (busquedaError) {
        console.error('Error en búsqueda:', busquedaError);
        setMensaje('Error al buscar el transporte: ' + busquedaError.message);
        setLoading(false);
        return;
      }

      if (!empresasEncontradas || empresasEncontradas.length === 0) {
        setMensaje('No se encontró ninguna empresa de transporte con ese CUIT en la red Nodexia. Debe registrarse primero desde el panel de Super Admin.');
        setLoading(false);
        return;
      }

      const empresaEncontrada = empresasEncontradas[0];

      console.log('✅ Transporte encontrado:', empresaEncontrada);

      // Mapear los datos de la empresa encontrada
      setNuevoTransporte({
        id: empresaEncontrada.id,
        nombre: empresaEncontrada.nombre,
        cuit: empresaEncontrada.cuit || cuitNormalizado,
        direccion: empresaEncontrada.direccion || '',
        localidad: empresaEncontrada.localidad || '',
        provincia: empresaEncontrada.provincia || '',
        ubicacion: `Lat: ${empresaEncontrada.latitud || 'N/A'}, Lng: ${empresaEncontrada.longitud || 'N/A'}`,
        telefono: empresaEncontrada.telefono || '',
        documentacion: [], // Se puede expandir con documentos reales
      });

    } catch (error) {
      console.error('❌ Error inesperado al buscar transporte:', error);
      setMensaje('Error inesperado al buscar el transporte');
    } finally {
      setLoading(false);
    }
  };

  // Asociar transporte existente
  const asociarTransporte = async () => {
    if (!nuevoTransporte) return;
    
    try {
      setLoading(true);
      console.log('🔗 Iniciando asociación de transporte:', nuevoTransporte.nombre);
      
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMensaje('Error: Usuario no autenticado');
        setLoading(false);
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
        console.error('Error obteniendo empresa del usuario:', userError);
        setMensaje('Error: No se pudo obtener la empresa del usuario');
        setLoading(false);
        return;
      }

      console.log('✅ Empresa coordinadora:', usuarioEmpresa.empresa_id);
      console.log('✅ Empresa transporte:', nuevoTransporte.id);

      // Verificar si ya existe la relación
      const { data: relacionExistente } = await supabase
        .from('relaciones_empresas')
        .select('id, estado')
        .eq('empresa_cliente_id', usuarioEmpresa.empresa_id)
        .eq('empresa_transporte_id', nuevoTransporte.id)
        .maybeSingle();

      if (relacionExistente) {
        if (relacionExistente.estado === 'activa') {
          setMensaje('Este transporte ya está asociado a tu empresa');
          setLoading(false);
          return;
        }
        
        // Reactivar relación existente
        const { error: updateError } = await supabase
          .from('relaciones_empresas')
          .update({ 
            estado: 'activa',
            fecha_inicio: new Date().toISOString().split('T')[0]
          })
          .eq('id', relacionExistente.id);

        if (updateError) {
          console.error('Error reactivando relación:', updateError);
          setMensaje('Error al reactivar la relación: ' + updateError.message);
          setLoading(false);
          return;
        }

        console.log('✅ Relación reactivada');
      } else {
        // Crear nueva relación
        const { data: relacionCreada, error: relacionError } = await supabase
          .from('relaciones_empresas')
          .insert({
            empresa_cliente_id: usuarioEmpresa.empresa_id,
            empresa_transporte_id: nuevoTransporte.id,
            estado: 'activa',
            fecha_inicio: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (relacionError) {
          console.error('Error creando relación:', relacionError);
          setMensaje('Error al crear la relación: ' + relacionError.message);
          setLoading(false);
          return;
        }

        console.log('✅ Relación creada:', relacionCreada);
      }

      setMensaje('✅ Transporte asociado correctamente a tu empresa');
      
      // Recargar la lista de transportes asociados
      await cargarTransportesAsociados();
      
      // Limpiar formulario
      setNuevoTransporte(null);
      setCuitInput('');

    } catch (error) {
      console.error('❌ Error inesperado al asociar transporte:', error);
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
      <div className="bg-gray-800 rounded shadow-md p-2 mb-2">
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
                onChange={e => {
                  // Permitir solo números y guiones
                  const value = e.target.value.replace(/[^\d-]/g, '');
                  setCuitInput(value);
                }}
                placeholder="CUIT (con o sin guiones)"
                maxLength={13}
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
      <div className="bg-gray-800 rounded shadow-md p-2">
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

 import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import FormCard from '../../components/ui/FormCard';
import { useChoferes } from '../../lib/hooks/useChoferes';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

interface UsuarioChofer {
  id: string;
  email: string;
  nombre_completo: string;
  foto_url?: string;
  telefono?: string;
  dni?: string;
}

export default function ChoferesGestion() {
  const [dniBusqueda, setDniBusqueda] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UsuarioChofer | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [currentUserId, setCurrentUserId] = useState<string|null>(null);
  const [empresaId, setEmpresaId] = useState<string|null>(null);
  const { choferes, loading: loadingChoferes, fetchChoferes, addChofer, deleteChofer } = useChoferes();
  const router = useRouter();

  // Get current user ID and empresa on component mount
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          setError('Error al obtener usuario actual');
          return;
        }
        if (user) {
          setCurrentUserId(user.id);
          
          // Obtener empresa del usuario
          const { data: usuarioEmpresa, error: empresaError } = await supabase
            .from('usuarios_empresa')
            .select('empresa_id')
            .eq('user_id', user.id)
            .eq('activo', true)
            .single();
            
          if (empresaError) {
            console.error('Error getting empresa:', empresaError);
            setError('Error al obtener empresa del usuario');
            return;
          }
          
          if (usuarioEmpresa) {
            setEmpresaId(usuarioEmpresa.empresa_id);
          }
        } else {
          setError('Usuario no encontrado');
        }
      } catch (err) {
        console.error('Exception getting user:', err);
        setError('Error al cargar datos del usuario');
      }
    }
    getCurrentUser();
  }, []);

  async function buscarChoferPorDNI() {
    if (!dniBusqueda.trim()) {
      setError('Ingrese un DNI para buscar');
      return;
    }

    setBuscando(true);
    setError(null);
    setUsuarioEncontrado(null);

    try {
      // Buscar usuario por DNI en la tabla usuarios
      // Primero buscar en usuarios_empresa que tenga el DNI en algún campo relacionado
      const { data: usuarios, error: searchError } = await supabase
        .from('usuarios_empresa')
        .select(`
          user_id,
          nombre_completo,
          email_interno,
          telefono_interno,
          rol_interno,
          empresa_id,
          empresas!inner(nombre, tipo_empresa)
        `)
        .eq('rol_interno', 'chofer')
        .eq('empresa_id', empresaId)
        .ilike('nombre_completo', `%${dniBusqueda}%`); // Buscar por DNI en nombre o crear campo específico

      if (searchError) {
        console.error('Error buscando usuario:', searchError);
        setError('Error al buscar usuario en el sistema');
        return;
      }

      // Si no encontramos por nombre_completo, buscar directamente en usuarios
      if (!usuarios || usuarios.length === 0) {
        // Buscar en la tabla usuarios por email que contenga el DNI o por nombre
        const { data: usuariosData, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, email, nombre_completo')
          .or(`email.ilike.%${dniBusqueda}%,nombre_completo.ilike.%${dniBusqueda}%`)
          .limit(5);

        if (usuariosError || !usuariosData || usuariosData.length === 0) {
          setError(`No se encontró un chofer con DNI "${dniBusqueda}" en tu empresa. Verifica que el usuario fue creado en Admin Nodexia con rol "Chofer" y asignado a tu empresa.`);
          return;
        }

        // Verificar que el usuario tenga rol chofer y pertenezca a la empresa
        const usuarioId = usuariosData[0].id;
        const { data: vinculacion, error: vinculacionError } = await supabase
          .from('usuarios_empresa')
          .select('rol_interno, empresa_id, telefono_interno')
          .eq('user_id', usuarioId)
          .eq('empresa_id', empresaId)
          .single();

        if (vinculacionError || !vinculacion || vinculacion.rol_interno !== 'chofer') {
          setError(`El usuario encontrado no es un chofer de tu empresa. Verifica que fue asignado correctamente en Admin Nodexia.`);
          return;
        }

        setUsuarioEncontrado({
          id: usuarioId,
          email: usuariosData[0].email,
          nombre_completo: usuariosData[0].nombre_completo,
          telefono: vinculacion.telefono_interno || undefined,
          dni: dniBusqueda
        });
      } else {
        // Usuario encontrado en usuarios_empresa
        setUsuarioEncontrado({
          id: usuarios[0].user_id,
          email: usuarios[0].email_interno,
          nombre_completo: usuarios[0].nombre_completo,
          telefono: usuarios[0].telefono_interno || undefined,
          dni: dniBusqueda
        });
      }
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setError('Error inesperado al buscar usuario');
    } finally {
      setBuscando(false);
    }
  }

  async function vincularChofer() {
    if (!usuarioEncontrado) return;
    
    setLoading(true);
    setError(null);

    try {
      // Verificar que el chofer no esté ya en la lista
      const yaExiste = choferes.some(c => c.usuario_id === usuarioEncontrado.id);
      if (yaExiste) {
        setError('Este chofer ya está en tu lista');
        setLoading(false);
        return;
      }

      const choferData: any = {
        nombre: usuarioEncontrado.nombre_completo.split(' ')[0],
        apellido: usuarioEncontrado.nombre_completo.split(' ').slice(1).join(' '),
        dni: usuarioEncontrado.dni || dniBusqueda,
        telefono: usuarioEncontrado.telefono || '',
        foto_url: usuarioEncontrado.foto_url || null,
        id_transporte: currentUserId,
        usuario_alta: currentUserId,
        usuario_id: usuarioEncontrado.id // ✅ Vinculación con usuario de Nodexia
      };

      await addChofer(choferData);
      
      // Limpiar formulario
      setDniBusqueda('');
      setUsuarioEncontrado(null);
      
      // Recargar lista
      fetchChoferes();
      
    } catch (err: unknown) {
      console.error('Error al vincular chofer:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error inesperado al vincular el chofer');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout pageTitle="Gestión de Choferes">
      <div className="w-full bg-gray-800 rounded shadow-md p-2 mt-2">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">Gestión de Choferes</h2>
        
        {/* Formulario de búsqueda y vinculación */}
        <div className="mb-6">
          <FormCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Los choferes deben ser creados primero en <strong>Admin Nodexia</strong> con rol "Chofer" y asignados a tu empresa.</p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-gray-200 mb-2 font-semibold">
                    Buscar Chofer por DNI o Nombre
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 rounded p-2 border border-gray-600 bg-gray-800 text-white" 
                      placeholder="Ej: 30123456 o Juan Pérez" 
                      value={dniBusqueda} 
                      onChange={e => setDniBusqueda(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), buscarChoferPorDNI())}
                    />
                    <button 
                      type="button"
                      onClick={buscarChoferPorDNI}
                      disabled={buscando || !dniBusqueda.trim()}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {buscando ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Usuario encontrado */}
              {usuarioEncontrado && (
                <div className="bg-gray-700 border border-cyan-500 rounded-lg p-4 mt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-bold text-white">{usuarioEncontrado.nombre_completo}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p><span className="font-semibold">Email:</span> {usuarioEncontrado.email}</p>
                        {usuarioEncontrado.telefono && (
                          <p><span className="font-semibold">Teléfono:</span> {usuarioEncontrado.telefono}</p>
                        )}
                        <p><span className="font-semibold">DNI:</span> {usuarioEncontrado.dni}</p>
                      </div>
                    </div>
                    <button
                      onClick={vincularChofer}
                      disabled={loading}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded font-bold shadow disabled:opacity-50"
                    >
                      {loading ? 'Vinculando...' : 'Agregar a mi Lista'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FormCard>
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mt-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
        <div className="mt-6">
          <div className="bg-gray-800 rounded-xl shadow p-0 md:p-2 border border-gray-700">
          <table className="w-full text-gray-200">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Apellido</th>
                <th className="p-3 text-left">DNI</th>
                <th className="p-3 text-left">Teléfono</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingChoferes ? (
                <tr><td colSpan={5} className="text-center p-6 text-gray-400">Cargando...</td></tr>
              ) : choferes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-gray-400">Sin choferes cargados.</td>
                </tr>
              ) : (
                choferes.map((v: { id?: string; nombre?: string; apellido?: string; dni?: string; telefono?: string }, i: number) => (
                  <tr key={v.id || i} className="hover:bg-gray-700 transition">
                    <td className="p-3">{v.nombre}</td>
                    <td className="p-3">{v.apellido}</td>
                    <td className="p-3 font-mono text-yellow-200">{v.dni}</td>
                    <td className="p-3">{v.telefono}</td>
                    <td className="p-3 flex gap-2">
                      <button className="text-yellow-400 underline hover:text-yellow-300" onClick={() => v.id && router.push(`/choferes/${v.id}`)}>Ver detalle</button>
                      <button className="text-red-400 hover:text-red-300" onClick={() => v.id && deleteChofer(v.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}

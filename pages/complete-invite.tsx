import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CompleteInvite() {
  const router = useRouter();
  const { token, type } = router.query;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type !== 'invite' || !token) {
      setError('Enlace de invitación inválido o expirado.');
    }
  }, [token, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!nombre || !apellido || !dni || !localidad || !telefono) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    // Completar el registro usando el token de invitación
    const { data, error: supaError } = await supabase.auth.exchangeCodeForSession(String(token));
    if (supaError) {
      setError('El enlace de invitación es inválido o expiró.');
      setLoading(false);
      return;
    }
    // Ahora el usuario está autenticado, actualiza la contraseña
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('No se pudo establecer la contraseña: ' + updateError.message);
      setLoading(false);
      return;
    }
    // Enviar datos adicionales al backend
    const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
    const accessToken = session?.access_token;
    const response = await fetch('/api/usuario/completar-perfil', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ nombre, apellido, dni, localidad, telefono })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'No se pudo completar el perfil.');
      setLoading(false);
      return;
    }
    setSuccess('¡Registro completado! Ya puedes iniciar sesión.');
    setLoading(false);
    setTimeout(() => router.push('/login'), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1a2d] px-4">
      <div className="bg-[#1b273b] p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4 text-center">Completar Registro</h1>
        {error && <div className="text-red-400 mb-2 text-center">{error}</div>}
        {success && <div className="text-green-400 mb-2 text-center">{success}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nombre"
            className="p-2 rounded bg-gray-700 text-white"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            className="p-2 rounded bg-gray-700 text-white"
            value={apellido}
            onChange={e => setApellido(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="DNI"
            className="p-2 rounded bg-gray-700 text-white"
            value={dni}
            onChange={e => setDni(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Localidad"
            className="p-2 rounded bg-gray-700 text-white"
            value={localidad}
            onChange={e => setLocalidad(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Teléfono"
            className="p-2 rounded bg-gray-700 text-white"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Nueva contraseña"
            className="p-2 rounded bg-gray-700 text-white"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            className="p-2 rounded bg-gray-700 text-white"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded"
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
}

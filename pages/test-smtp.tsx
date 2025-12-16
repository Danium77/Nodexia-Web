import { useState } from 'react';
import Card from '@/components/ui/Card';

export default function TestSMTP() {
  const [emailTest, setEmailTest] = useState('');
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [createResult, setCreateResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/diagnosticar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTest || 'test@example.com' })
      });
      const result = await response.json();
      setDiagnosticResult(result);
    } catch (error) {
      console.error('Error:', error);
      setDiagnosticResult({ error: 'Error al realizar diagnóstico' });
    }
    setLoading(false);
  };

  const testCreateUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/crear-usuario-sin-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTest || 'test@example.com',
          nombre: 'Usuario de Prueba',
          empresa_id: '123e4567-e89b-12d3-a456-426614174000', // UUID ficticio para prueba
          rol_interno: 'transporte'
        })
      });
      const result = await response.json();
      setCreateResult(result);
    } catch (error) {
      console.error('Error:', error);
      setCreateResult({ error: 'Error al crear usuario' });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">🔬 Prueba de Sistema SMTP</h1>
      
      <Card title="Configuración de Prueba">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email de Prueba:</label>
            <input
              value={emailTest}
              onChange={(e) => setEmailTest(e.target.value)}
              placeholder="test@example.com"
              type="email"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={testDiagnostic} 
              disabled={loading}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              🔬 Diagnóstico SMTP
            </button>
            <button 
              onClick={testCreateUser} 
              disabled={loading}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50"
            >
              🔗 Crear Usuario Manual
            </button>
          </div>
        </div>
      </Card>

      {diagnosticResult && (
        <Card title="📊 Resultado del Diagnóstico">
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
            {JSON.stringify(diagnosticResult, null, 2)}
          </pre>
        </Card>
      )}

      {createResult && (
        <Card title="👤 Resultado de Creación de Usuario">
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
            {JSON.stringify(createResult, null, 2)}
          </pre>
        </Card>
      )}

      <Card title="📋 Guía de Pruebas">
        <div className="space-y-2 text-sm">
          <p><strong>1. Diagnóstico SMTP:</strong> Verifica si el SMTP está configurado correctamente</p>
          <p><strong>2. Crear Usuario Manual:</strong> Prueba el sistema de enlaces manuales</p>
          <p><strong>3. Revisar Respuestas:</strong> Analiza los JSON devueltos para entender el estado</p>
          <p><strong>4. Probar en Admin:</strong> Ve a /admin/usuarios para usar las funciones reales</p>
        </div>
      </Card>
    </div>
  );
}
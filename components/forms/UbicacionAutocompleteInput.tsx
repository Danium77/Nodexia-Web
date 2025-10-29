import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { UbicacionAutocomplete } from '@/types/ubicaciones';

interface UbicacionAutocompleteProps {
  tipo: 'origen' | 'destino';
  value: string;
  onSelect: (ubicacion: UbicacionAutocomplete) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

const UbicacionAutocompleteInput: React.FC<UbicacionAutocompleteProps> = ({
  tipo,
  value,
  onSelect,
  placeholder,
  disabled = false,
  required = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<UbicacionAutocomplete[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Actualizar input cuando cambia el value desde afuera
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Buscar ubicaciones con debounce
  const buscarUbicaciones = async (termino: string) => {
    if (termino.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    
    try {
      // 🔥 Obtener el token de sesión de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('❌ No hay token de sesión');
        setResults([]);
        setShowDropdown(false);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/ubicaciones/buscar?tipo=${tipo}&q=${encodeURIComponent(termino)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error en API:', response.status, errorData);
        throw new Error('Error al buscar ubicaciones');
      }

      const data = await response.json();
      console.log(`✅ Ubicaciones encontradas (${tipo}):`, data.length);
      if (data.length > 0) {
        console.log('Primera ubicación:', data[0]);
      }
      setResults(data);
      setShowDropdown(data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('❌ Error buscando ubicaciones:', error);
      setResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de input con debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Buscar después de 300ms
    debounceTimer.current = setTimeout(() => {
      buscarUbicaciones(newValue);
    }, 300);
  };

  // Seleccionar ubicación
  const handleSelect = (ubicacion: UbicacionAutocomplete) => {
    const displayValue = ubicacion.alias || ubicacion.nombre;
    setInputValue(displayValue);
    setShowDropdown(false);
    setResults([]);
    onSelect(ubicacion);
  };

  // Manejar teclas (flechas, enter, escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder || `Buscar ${tipo} por nombre o CUIT...`}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        autoComplete="off"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((ubicacion, index) => (
            <button
              key={ubicacion.id}
              type="button"
              onClick={() => handleSelect(ubicacion)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-gray-700' : ''
              } ${index > 0 ? 'border-t border-gray-700' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {ubicacion.alias || ubicacion.nombre}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      ubicacion.tipo === 'planta' ? 'bg-blue-900 text-blue-200' :
                      ubicacion.tipo === 'deposito' ? 'bg-purple-900 text-purple-200' :
                      'bg-green-900 text-green-200'
                    }`}>
                      {ubicacion.tipo}
                    </span>
                  </div>
                  
                  {ubicacion.alias && (
                    <div className="text-sm text-gray-400 mt-0.5">
                      {ubicacion.nombre}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-400 mt-1">
                    <span className="font-mono">{ubicacion.cuit}</span>
                    {ubicacion.ciudad && ubicacion.provincia && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{ubicacion.ciudad}, {ubicacion.provincia}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {ubicacion.direccion}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && !loading && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-4 text-center text-gray-400">
          <div className="text-sm">No se encontraron ubicaciones</div>
          <div className="text-xs mt-1">
            Probá con otro término de búsqueda
          </div>
        </div>
      )}
    </div>
  );
};

export default UbicacionAutocompleteInput;

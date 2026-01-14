import { useState, useMemo, useCallback } from 'react';

interface UseSearchOptions<T> {
  items: T[];
  searchFields: (keyof T)[];
  defaultTerm?: string;
}

/**
 * Normaliza texto removiendo acentos y caracteres especiales
 * Ejemplo: "Logística Express" → "logistica express"
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD') // Descompone caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas (acentos)
    .toLowerCase()
    .trim();
}

export function useSearch<T>({ items, searchFields, defaultTerm = '' }: UseSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState(defaultTerm);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const normalizedSearchTerm = normalizeText(searchTerm);
    
    return items.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;
        const normalizedValue = normalizeText(String(value));
        return normalizedValue.includes(normalizedSearchTerm);
      });
    });
  }, [items, searchTerm, searchFields]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch,
    resultsCount: filteredItems.length,
    hasResults: filteredItems.length > 0,
    isSearching: searchTerm.trim().length > 0
  };
}

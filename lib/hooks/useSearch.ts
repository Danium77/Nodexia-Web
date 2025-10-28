import { useState, useEffect, useMemo, useCallback } from 'react';

interface UseSearchOptions<T> {
  items: T[];
  searchFields: (keyof T)[];
  defaultTerm?: string;
}

export function useSearch<T>({ items, searchFields, defaultTerm = '' }: UseSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState(defaultTerm);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return items.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [items, searchTerm, searchFields]);

  const clearSearch = useCallback(() => setSearchTerm(''), []); // ✅ Memoizado

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

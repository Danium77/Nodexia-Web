import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useChoferes() {
  const [choferes, setChoferes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChoferes();
  }, []);

  async function fetchChoferes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('choferes')
      .select('*')
      .order('apellido', { ascending: true });
    if (error) setError(error);
    setChoferes(data || []);
    setLoading(false);
  }

  async function addChofer(chofer) {
    const { data, error } = await supabase
      .from('choferes')
      .insert([chofer])
      .select();
    if (error) throw error;
    setChoferes((prev) => [...prev, ...(data || [])]);
    return data?.[0];
  }

  async function updateChofer(id, updates) {
    const { data, error } = await supabase
      .from('choferes')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    setChoferes((prev) => prev.map((c) => (c.id === id ? data[0] : c)));
    return data?.[0];
  }

  async function deleteChofer(id) {
    const { error } = await supabase
      .from('choferes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setChoferes((prev) => prev.filter((c) => c.id !== id));
  }

  return {
    choferes,
    loading,
    error,
    fetchChoferes,
    addChofer,
    updateChofer,
    deleteChofer,
  };
}

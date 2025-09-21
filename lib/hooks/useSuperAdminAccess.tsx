import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useSuperAdminAccess() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkSuperAdminStatus();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
        checkSuperAdminStatus();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSuperAdminStatus = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperAdmin(false);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(user);

      // Verificar si es super admin directamente desde la tabla
      const { data, error } = await supabase
        .from('super_admins')
        .select('activo')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin(!!data);
      }
    } catch (error) {
      console.error('Error in checkSuperAdminStatus:', error);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isSuperAdmin,
    loading,
    user,
    refetch: checkSuperAdminStatus
  };
}

export default useSuperAdminAccess;
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

interface UserContextType {
  email: string;
  name: string;
  role: string;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  email: '',
  name: '',
  role: '',
  loading: true,
});

export const useUserContext = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // First check if we have a session before calling getUser
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setEmail('');
          setName('');
          setRole('');
          setLoading(false);
          router.replace('/login');
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          setEmail('');
          setName('');
          setRole('');
          setLoading(false);
          router.replace('/login');
          return;
        }
        
        if (!user) {
          setEmail('');
          setName('');
          setRole('');
          setLoading(false);
          router.replace('/login');
          return;
        }

        setEmail(user.email || '');
        setName(user.user_metadata?.nombre_completo || user.email?.split('@')[0] || 'Usuario');
        
        // Consultar roles del usuario
        const { data: profileUser, error: profileError } = await supabase
          .from('profile_users')
          .select('roles(name)')
          .eq('user_id', user.id)
          .single();
          
        let userRole = '';
        if (profileUser && profileUser.roles) {
          const roles = Array.isArray(profileUser.roles) ? profileUser.roles : [profileUser.roles];
          if (roles.some((role: any) => role.name === 'admin')) {
            userRole = 'admin';
          } else if (roles.some((role: any) => role.name === 'coordinador')) {
            userRole = 'coordinador';
          } else if (roles.some((role: any) => role.name === 'transporte')) {
            userRole = 'transporte';
          } else {
            userRole = roles[0]?.name || '';
          }
        }
        setRole(userRole);
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchUser:', error);
        setEmail('');
        setName('');
        setRole('');
        setLoading(false);
        router.replace('/login');
      }
    };
    
    fetchUser();
    // Refetch user on route change
  }, [router.pathname]);

  return (
    <UserContext.Provider value={{ email, name, role, loading }}>
      {children}
    </UserContext.Provider>
  );
};

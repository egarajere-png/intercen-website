import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/SupabaseClient';

export type UserRole =
  | 'reader' | 'author' | 'publisher' | 'editor'
  | 'moderator' | 'admin' | 'corporate_user' | 'vendor' | null;

interface RoleContextValue {
  role: UserRole;
  userId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthor: boolean;
  isEditor: boolean;
  isModerator: boolean;
  refetch: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue>({
  role: null, userId: null, loading: true,
  isAdmin: false, isAuthor: false, isEditor: false, isModerator: false,
  refetch: async () => {},
});

export const useRole = () => useContext(RoleContext);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSet = async (uid: string | null) => {
    if (!uid) {
      setRole(null);
      setUserId(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();
      setRole((data?.role as UserRole) ?? 'reader');
      setUserId(uid);
    } catch {
      setRole('reader');
      setUserId(uid);
    }
    setLoading(false);
  };

  const refetch = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetchAndSet(session?.user?.id ?? null);
  };

  useEffect(() => {
    // Step 1: resolve on mount using getSession
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchAndSet(session?.user?.id ?? null);
    });

    // Step 2: react to sign in / sign out after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchAndSet(session?.user?.id ?? null);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setUserId(null);
        setLoading(false);
      }
      // Ignore INITIAL_SESSION, TOKEN_REFRESHED etc — getSession handles those
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <RoleContext.Provider value={{
      role, userId, loading,
      isAdmin: role === 'admin',
      isAuthor: role === 'author' || role === 'publisher',
      isEditor: role === 'editor',
      isModerator: role === 'moderator',
      refetch,
    }}>
      {children}
    </RoleContext.Provider>
  );
};
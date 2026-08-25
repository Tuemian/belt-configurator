import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  rolesLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  const loadRoles = async (uid: string | null) => {
    if (!uid) { setIsAdmin(false); return; }
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid);
      if (error) { setIsAdmin(false); return; }
      setIsAdmin((data ?? []).some((r: { role: string }) => r.role === 'admin'));
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      // defer to avoid recursive supabase calls
      setTimeout(() => { void loadRoles(s?.user?.id ?? null); }, 0);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
      void loadRoles(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  const refreshRoles = async () => {
    await loadRoles(session?.user?.id ?? null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAdmin, rolesLoading, signIn, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

/**
 * Authentication Hook for Призма
 * Provides authentication state and methods
 */

'use client';

import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';
import { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Tables } from '@/types';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Tables<'profiles'> | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  let supabase: any = null;
  try {
    supabase = createBrowserClient();
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    setError('Грешка при свързване със сървъра');
    setLoading(false);
  }

  const refreshUser = async () => {
    if (!supabase) {
      console.error('No Supabase client available');
      setLoading(false);
      return;
    }

    try {
      console.log('Refreshing user authentication...');

      // Add timeout to auth request
      const authPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 8000)
      );

      const { data: { user: currentUser }, error: userError } = await Promise.race([authPromise, timeoutPromise]);

      if (userError) {
        console.error('Error getting user:', userError);
        throw userError;
      }

      console.log('User fetched:', currentUser?.email || 'No user');
      setUser(currentUser);

      // Cache auth state
      if (typeof window !== 'undefined') {
        localStorage.setItem('prizma_auth_cache', JSON.stringify({
          user: currentUser,
          timestamp: Date.now()
        }));
      }

      if (currentUser) {
        // Fetch user profile with timeout
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        const profileTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile timeout')), 5000)
        );

        try {
          const { data: userProfile } = await Promise.race([profilePromise, profileTimeoutPromise]);
          setProfile(userProfile);
        } catch (profileError) {
          console.warn('Profile fetch timed out, continuing without profile');
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setProfile(null);

      // Clear cache on error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('prizma_auth_cache');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);

      // Clear auth cache
      if (typeof window !== 'undefined') {
        localStorage.removeItem('prizma_auth_cache');
      }

      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize from cache on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialized) {
      const cachedAuth = localStorage.getItem('prizma_auth_cache');
      if (cachedAuth) {
        try {
          const { user: cachedUser, timestamp } = JSON.parse(cachedAuth);
          // Use cached data if less than 5 minutes old
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setUser(cachedUser);
            setLoading(false);
            setInitialized(true);
            return;
          }
        } catch (err) {
          localStorage.removeItem('prizma_auth_cache');
        }
      }
    }
  }, [initialized]);

  useEffect(() => {
    if (!supabase) return;

    // Only fetch if not initialized from cache
    if (!initialized) {
      refreshUser().then(() => setInitialized(true));
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);

          // Cache new auth state
          if (typeof window !== 'undefined') {
            localStorage.setItem('prizma_auth_cache', JSON.stringify({
              user: session?.user || null,
              timestamp: Date.now()
            }));
          }

          if (session?.user) {
            // Fetch user profile with timeout
            try {
              const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              const profileTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile timeout')), 5000)
              );

              const { data: userProfile } = await Promise.race([profilePromise, profileTimeoutPromise]);
              setProfile(userProfile);
            } catch (profileError) {
              console.warn('Profile fetch failed during auth change:', profileError);
              setProfile(null);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);

          // Clear cache on sign out
          if (typeof window !== 'undefined') {
            localStorage.removeItem('prizma_auth_cache');
          }
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signOut,
    refreshUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
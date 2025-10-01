/**
 * Simplified Supabase Client Configuration for Призма Receipt App
 * Production-ready setup with proper TypeScript support
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Client-side Supabase client with proper SSR support
 * Use this in React components and client-side code
 */
export const createBrowserClient = () => {
  // Detailed error messages for debugging
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    console.error('Environment check failed:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
    console.error('All env vars:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
    });
    throw new Error('NEXT_PUBLIC_SUPABASE_URL е задължителна променлива. Проверете .env.local файла.');
  }

  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    console.error('Environment check failed:');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY е задължителна променлива. Проверете .env.local файла.');
  }

  try {
    // Use SSR-compatible client for better cookie handling
    if (typeof window !== 'undefined') {
      const { createBrowserClient: createSSRBrowserClient } = require('@supabase/ssr');

      return (createSSRBrowserClient as any)(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            const value = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1];
            return value;
          },
          set(name: string, value: string, options: any) {
            let cookieString = `${name}=${value}`;
            if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
            if (options?.path) cookieString += `; path=${options.path}`;
            if (options?.domain) cookieString += `; domain=${options.domain}`;
            if (options?.secure) cookieString += `; secure`;
            if (options?.httpOnly) cookieString += `; httponly`;
            if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
            document.cookie = cookieString;
          },
          remove(name: string, options: any) {
            this.set(name, '', { ...options, maxAge: 0 });
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'Prizma-Web-App',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          fetch: (url: any, options: any = {}) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            return fetch(url, {
              ...options,
              signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
          }
        }
      });
    }

    // Fallback for server-side rendering
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'Prizma-Web-App',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        fetch: (url, options = {}) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          return fetch(url, {
            ...options,
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to create Supabase client:', error);
    throw new Error(`Грешка при създаване на Supabase клиент: ${error.message}`);
  }
};

/**
 * Server-side Supabase client for API routes
 * Use this in API routes and server actions
 */
export const createServerClient = (useServiceKey = false) => {
  const key = useServiceKey ? supabaseServiceKey : supabaseAnonKey;

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': useServiceKey ? 'Prizma-Server-Admin' : 'Prizma-Server-App',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }
  });
};

/**
 * Middleware-specific Supabase client using SSR
 * Use this specifically in middleware for authentication checks
 */
export const createMiddlewareClient = (request: any) => {
  const { createServerClient: createSSRClient } = require('@supabase/ssr');

  return (createSSRClient as any)(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // We can't set cookies in middleware, but we can read them
      },
      remove(name: string, options: any) {
        // We can't remove cookies in middleware
      },
    },
  });
};

/**
 * Admin client with service role key
 * Use this for administrative operations that bypass RLS
 */
export const createAdminClient = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'Prizma-Admin',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }
  });
};

// Export default browser client for convenience
export default createBrowserClient;
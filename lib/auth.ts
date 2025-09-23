/**
 * Authentication Utilities for Призма Receipt App
 * Provides helper functions for authentication and user management
 */

import { createBrowserClient, createServerClient } from './supabase-simple';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Tables } from '@/types';
import { AuthError } from '@supabase/supabase-js';

// ============================================================================
// CLIENT-SIDE AUTH FUNCTIONS
// ============================================================================

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string, userData?: Record<string, any>) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData || {}
    }
  });

  if (error) throw error;

  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const supabase = createBrowserClient();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const supabase = createBrowserClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });

  if (error) throw error;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = createBrowserClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = createBrowserClient();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) throw error;

  return session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createBrowserClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

// ============================================================================
// SERVER-SIDE AUTH FUNCTIONS
// ============================================================================

/**
 * Get current user on server-side (for use in Server Components)
 */
export async function getServerUser() {
  const supabase = createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting server user:', error);
    return null;
  }

  return user;
}

/**
 * Get current session on server-side
 */
export async function getServerSession() {
  const supabase = createServerClient();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting server session:', error);
    return null;
  }

  return session;
}

/**
 * Get user profile with additional data
 */
export async function getUserProfile(userId?: string): Promise<Tables<'profiles'> | null> {
  const supabase = createServerClient();

  // If no userId provided, get current user
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return profile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: Partial<Tables<'profiles'>>) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Create user profile (usually called after signup)
 */
export async function createUserProfile(user: SupabaseUser) {
  const supabase = createBrowserClient();

  const profile = {
    id: user.id,
    email: user.email!,
    full_name: user.user_metadata?.full_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    role: 'user' as const
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ============================================================================
// AUTH GUARDS
// ============================================================================

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Require specific role
 */
export async function requireRole(role: string) {
  const profile = await getUserProfile();

  if (!profile || profile.role !== role) {
    throw new Error(`Role '${role}' required`);
  }

  return profile;
}

/**
 * Check if user has permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const profile = await getUserProfile();

    if (!profile) return false;

    // Admin has all permissions
    if (profile.role === 'admin') return true;

    // For now, just check if user exists - extend based on your needs
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// AUTH STATE MANAGEMENT
// ============================================================================

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: SupabaseUser | null) => void) {
  const supabase = createBrowserClient();

  return supabase.auth.onAuthStateChange((event: any, session: any) => {
    callback(session?.user || null);
  });
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(user: SupabaseUser | null): boolean {
  return !!user;
}

/**
 * Get user role from user object
 */
export function getUserRole(user: SupabaseUser | null): string | null {
  return user?.user_metadata?.role || null;
}

/**
 * Check if user has specific role
 */
export function userHasRole(user: SupabaseUser | null, role: string): boolean {
  const userRole = getUserRole(user);
  return userRole === role || userRole === 'admin';
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Map auth errors to user-friendly messages
 */
export function getAuthErrorMessage(error: AuthError): string {
  // Handle both message matching and code matching
  const message = error.message;
  const code = error.code || (error as any).error_code;

  // First try to match by message
  switch (message) {
    case 'Invalid login credentials':
      return 'Невалидни данни за влизане';

    case 'Email not confirmed':
      return 'Имейлът не е потвърден. Проверете пощата си';

    case 'Password should be at least 6 characters':
    case 'Password should be at least 6 characters.':
      return 'Паролата трябва да е поне 6 символа';

    case 'User already registered':
      return 'Потребител с този имейл вече съществува';

    case 'Signup is disabled':
      return 'Регистрацията е временно недостъпна';

    case 'Email rate limit exceeded':
      return 'Твърде много опити. Опитайте отново по-късно';

    case 'Token has expired or is invalid':
      return 'Връзката е изтекла или невалидна';
  }

  // If no message match, try to match by error code
  switch (code) {
    case 'weak_password':
      return 'Паролата е твърде слаба. Трябва да е поне 6 символа';

    case 'validation_failed':
      if (message.includes('email')) {
        return 'Невалиден имейл адрес';
      }
      return 'Невалидни данни';

    case 'email_address_invalid':
      return 'Невалиден имейл адрес';

    case 'signup_disabled':
      return 'Регистрацията е временно недостъпна';

    case 'over_email_send_rate_limit':
      return 'Твърде много опити за изпращане на имейл. Опитайте отново по-късно';

    case 'email_not_confirmed':
      return 'Имейлът не е потвърден. Проверете пощата си';

    case 'invalid_credentials':
      return 'Невалидни данни за влизане';

    case 'too_many_requests':
      return 'Твърде много опити. Опитайте отново по-късно';
  }

  // Fallback - check for common patterns in message
  if (message.includes('password') && (message.includes('6') || message.includes('weak'))) {
    return 'Паролата трябва да е поне 6 символа';
  }

  if (message.includes('email') && message.includes('invalid')) {
    return 'Невалиден имейл адрес';
  }

  if (message.includes('already') && message.includes('registered')) {
    return 'Потребител с този имейл вече съществува';
  }

  // Default fallback
  console.error('Unhandled auth error:', { message, code, error });
  return 'Възникна грешка при автентикация';
}

/**
 * Handle auth errors consistently
 */
export function handleAuthError(error: AuthError): never {
  const message = getAuthErrorMessage(error);
  throw new Error(message);
}
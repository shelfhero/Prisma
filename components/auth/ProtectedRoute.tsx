/**
 * Protected Route Component for Призма
 * Wrapper for pages that require authentication
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-sm text-gray-600">Зареждане...</p>
    </div>
  </div>
);

export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
  loadingComponent = <LoadingSpinner />
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // Redirect to login with current path as redirect parameter
        const redirectUrl = new URL(redirectTo, window.location.origin);
        redirectUrl.searchParams.set('redirect', pathname);
        redirectUrl.searchParams.set('reason', 'auth_required');

        router.push(redirectUrl.toString());
      } else if (!requireAuth && user) {
        // Redirect authenticated users away from auth pages
        router.push('/dashboard');
      }
    }
  }, [user, loading, requireAuth, redirectTo, pathname, router]);

  // Show loading while checking auth state
  if (loading) {
    return <>{loadingComponent}</>;
  }

  // Show children if auth requirements are met
  if (requireAuth && !user) {
    return <>{loadingComponent}</>;
  }

  if (!requireAuth && user) {
    return <>{loadingComponent}</>;
  }

  return <>{children}</>;
}
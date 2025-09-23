/**
 * Auth Guard Component for Призма
 * Conditional rendering based on authentication state
 */

'use client';

import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: string;
  loadingComponent?: React.ReactNode;
}

const DefaultLoading = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

const DefaultFallback = () => (
  <div className="text-center p-8">
    <div className="mx-auto h-12 w-12 flex items-center justify-center bg-gray-100 rounded-full mb-4">
      <svg
        className="h-6 w-6 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Необходимо е влизане
    </h3>
    <p className="text-gray-600">
      Трябва да влезете в профила си за да видите това съдържание
    </p>
  </div>
);

export default function AuthGuard({
  children,
  fallback = <DefaultFallback />,
  requireAuth = true,
  requireRole,
  loadingComponent = <DefaultLoading />
}: AuthGuardProps) {
  const { user, profile, loading } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return <>{loadingComponent}</>;
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return <>{fallback}</>;
  }

  // Check role requirement
  if (requireRole && profile?.role !== requireRole) {
    return (
      <div className="text-center p-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center bg-red-100 rounded-full mb-4">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Няма достатъчно права
        </h3>
        <p className="text-gray-600">
          Нямате необходимите права за достъп до това съдържание
        </p>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}
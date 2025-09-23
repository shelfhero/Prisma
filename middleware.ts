/**
 * Authentication Middleware for Призма Receipt App
 * Handles route protection, token refresh, and user session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase-simple';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/receipts',
  '/profile',
  '/settings',
  '/api/receipts',
  '/api/user'
];

// Routes that should redirect authenticated users away
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password'
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/auth',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml'
];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth'
];

/**
 * Check if a path matches any pattern in the given array
 */
function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(path => {
    if (path.endsWith('*')) {
      return pathname.startsWith(path.slice(0, -1));
    }
    return pathname === path || pathname.startsWith(path + '/');
  });
}

/**
 * Determine if a route requires authentication
 */
function requiresAuth(pathname: string): boolean {
  // Check if it's a public route first
  if (matchesPath(pathname, PUBLIC_ROUTES) || matchesPath(pathname, PUBLIC_API_ROUTES)) {
    return false;
  }

  // Check if it's a protected route
  return matchesPath(pathname, PROTECTED_ROUTES);
}

/**
 * Determine if a route is an auth page that authenticated users shouldn't see
 */
function isAuthRoute(pathname: string): boolean {
  return matchesPath(pathname, AUTH_ROUTES);
}

/**
 * Create login redirect response
 */
function createLoginRedirect(request: NextRequest, reason?: string): NextResponse {
  const redirectUrl = new URL('/auth/login', request.url);

  // Add the original URL as a redirect parameter
  redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);

  if (reason) {
    redirectUrl.searchParams.set('reason', reason);
  }

  const response = NextResponse.redirect(redirectUrl);

  // Add Bulgarian error message for better UX
  response.headers.set('X-Auth-Error', encodeURIComponent('Необходимо е влизане в системата'));

  return response;
}

/**
 * Create dashboard redirect for authenticated users on auth pages
 */
function createDashboardRedirect(request: NextRequest): NextResponse {
  const redirectUrl = new URL('/dashboard', request.url);
  return NextResponse.redirect(redirectUrl);
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internal routes and static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  try {
    // Create Supabase client with request context for cookie handling
    const supabase = createMiddlewareClient(request);

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Log authentication attempts in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Middleware] ${request.method} ${pathname} - Session:`,
        session ? `✅ ${session.user.email}` : '❌ None');
    }

    // Handle session errors
    if (sessionError) {
      console.error('Session error in middleware:', sessionError);

      if (requiresAuth(pathname)) {
        return createLoginRedirect(request, 'session_error');
      }

      return NextResponse.next();
    }

    // Handle protected routes
    if (requiresAuth(pathname)) {
      if (!session?.user) {
        return createLoginRedirect(request, 'auth_required');
      }

      // Verify user is still valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.warn('Invalid user session detected:', userError);
        return createLoginRedirect(request, 'invalid_session');
      }

      // Add user info to headers for API routes
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.next();
        response.headers.set('X-User-ID', user.id);
        response.headers.set('X-User-Email', user.email || '');
        response.headers.set('X-User-Role', user.user_metadata?.role || 'user');
        return response;
      }
    }

    // Handle auth routes (redirect authenticated users away)
    if (isAuthRoute(pathname) && session?.user) {
      // Check if there's a redirect parameter
      const redirectTo = request.nextUrl.searchParams.get('redirect');

      if (redirectTo && !isAuthRoute(redirectTo)) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }

      return createDashboardRedirect(request);
    }

    // Handle token refresh for authenticated users
    if (session?.user) {
      // Check if token is close to expiration (within 5 minutes)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = (expiresAt || 0) - now;

      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) { // Less than 5 minutes
        try {
          const { data: { session: refreshedSession }, error: refreshError } =
            await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn('Token refresh failed:', refreshError);

            if (requiresAuth(pathname)) {
              return createLoginRedirect(request, 'token_refresh_failed');
            }
          } else if (refreshedSession) {
            console.log('Token refreshed successfully for user:', refreshedSession.user.email);
          }
        } catch (error) {
          console.error('Token refresh error:', error);
        }
      }
    }

    // Add security headers
    const secureResponse = NextResponse.next();

    // Prevent clickjacking
    secureResponse.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    secureResponse.headers.set('X-Content-Type-Options', 'nosniff');

    // XSS protection
    secureResponse.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    secureResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy for enhanced security
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust as needed for your app
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://eisfwocfkejsxipmbyzp.supabase.co https://api.tabscanner.com",
      "frame-ancestors 'none'"
    ].join('; ');

    secureResponse.headers.set('Content-Security-Policy', csp);

    return secureResponse;

  } catch (error) {
    console.error('Middleware error:', error);

    // In case of middleware errors, allow public routes but protect sensitive ones
    if (requiresAuth(pathname)) {
      return createLoginRedirect(request, 'middleware_error');
    }

    return NextResponse.next();
  }
}

/**
 * Matcher configuration for middleware
 * This determines which routes the middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\..*$).*)',
  ],
};

/**
 * Additional utility functions for use in components
 */

/**
 * Check if user is authenticated (for use in components)
 */
export function isAuthenticated(session: any): boolean {
  return !!(session?.user && session?.access_token);
}

/**
 * Get user role from session (for use in components)
 */
export function getUserRole(session: any): string {
  return session?.user?.user_metadata?.role || 'user';
}

/**
 * Check if user has specific role (for use in components)
 */
export function hasRole(session: any, role: string): boolean {
  const userRole = getUserRole(session);

  // Define role hierarchy
  const roleHierarchy = {
    'admin': ['admin', 'user'],
    'user': ['user']
  };

  return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(role) || false;
}
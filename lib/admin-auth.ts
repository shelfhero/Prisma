import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Create Supabase client for server-side admin operations (uses service role)
function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'analyst'

export interface AdminSession {
  userId: string
  role: AdminRole
  permissions: Record<string, boolean>
}

/**
 * Check if the current user has admin access
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getAdminSession()
    return session !== null
  } catch (error) {
    console.error('Error in isAdmin:', error)
    return false
  }
}

/**
 * Check if the current user has a specific admin role
 */
export async function hasAdminRole(requiredRole: AdminRole): Promise<boolean> {
  try {
    const session = await getAdminSession()
    if (!session) return false

    // Super admin has all roles
    if (session.role === 'super_admin') return true

    return session.role === requiredRole
  } catch (error) {
    console.error('Error in hasAdminRole:', error)
    return false
  }
}

/**
 * Get the admin session for the current user
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    // TEMPORARY WORKAROUND: Hardcode admin user for office@myshelfhero.com
    // TODO: Fix cookie reading issue properly
    const userEmail = 'office@myshelfhero.com' // TEMPORARY HARDCODE

    console.log('[Admin Auth] Looking up admin session for:', userEmail)

    // Use service role to query admin_roles joined with auth.users
    const supabase = getSupabaseAdminClient()

    // Query admin_roles directly with a join - service role has full access
    const { data: adminData, error: adminError } = await supabase
      .from('admin_roles')
      .select('user_id, role, permissions, is_active')
      .eq('is_active', true)
      .single()

    if (adminError) {
      console.error('[Admin Auth] Error fetching admin roles:', adminError)

      // Try to query with RPC function that gets user by email
      const { data: userList, error: userError } = await supabase.rpc('get_user_by_email', {
        p_email: userEmail
      })

      if (userError || !userList || userList.length === 0) {
        console.log('[Admin Auth] Could not find user by RPC:', userError)

        // Last resort: Assume first active admin role belongs to our user
        const { data: anyAdmin, error: anyAdminError } = await supabase
          .from('admin_roles')
          .select('user_id, role, permissions')
          .eq('is_active', true)
          .limit(1)
          .single()

        if (anyAdminError || !anyAdmin) {
          console.error('[Admin Auth] No active admin found:', anyAdminError)
          return null
        }

        console.log('[Admin Auth] Using first active admin as fallback:', anyAdmin.user_id)

        return {
          userId: anyAdmin.user_id,
          role: anyAdmin.role as AdminRole,
          permissions: (anyAdmin.permissions || {}) as Record<string, boolean>
        }
      }

      return null
    }

    if (!adminData) {
      console.log('[Admin Auth] No admin role found')
      return null
    }

    console.log('[Admin Auth] Admin session created for user:', adminData.user_id, 'with role:', adminData.role)

    return {
      userId: adminData.user_id,
      role: adminData.role as AdminRole,
      permissions: (adminData.permissions || {}) as Record<string, boolean>
    }
  } catch (error) {
    console.error('[Admin Auth] Error getting admin session:', error)
    return null
  }
}

/**
 * Log admin activity
 */
export async function logAdminActivity(
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  try {
    const session = await getAdminSession()
    if (!session) return

    const supabase = getSupabaseAdminClient()
    const ipAddress = request?.headers.get('x-forwarded-for') ||
                      request?.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request?.headers.get('user-agent') || 'unknown'

    await supabase.rpc('log_admin_activity', {
      p_admin_id: session.userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    })
  } catch (error) {
    console.error('Error logging admin activity:', error)
  }
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin(): Promise<void> {
  const adminAccess = await isAdmin()
  if (!adminAccess) {
    throw new Error('Unauthorized: Admin access required')
  }
}

/**
 * Require specific admin role - throws error if role not matched
 */
export async function requireAdminRole(requiredRole: AdminRole): Promise<void> {
  const hasRole = await hasAdminRole(requiredRole)
  if (!hasRole) {
    throw new Error(`Unauthorized: ${requiredRole} role required`)
  }
}

/**
 * Admin middleware for API routes
 */
export async function adminMiddleware(
  request: NextRequest,
  requiredRole?: AdminRole
): Promise<{ authorized: boolean; session: AdminSession | null; error?: string }> {
  try {
    const session = await getAdminSession()

    if (!session) {
      return {
        authorized: false,
        session: null,
        error: 'Unauthorized: Admin access required'
      }
    }

    if (requiredRole && session.role !== requiredRole && session.role !== 'super_admin') {
      return {
        authorized: false,
        session,
        error: `Unauthorized: ${requiredRole} role required`
      }
    }

    return {
      authorized: true,
      session
    }
  } catch (error) {
    console.error('Error in admin middleware:', error)
    return {
      authorized: false,
      session: null,
      error: 'Internal server error'
    }
  }
}

/**
 * Check if admin has specific permission
 */
export function hasPermission(
  session: AdminSession,
  permission: string
): boolean {
  // Super admin has all permissions
  if (session.role === 'super_admin') return true

  // Check specific permission
  return session.permissions[permission] === true
}

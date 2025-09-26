'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { user, profile, loading: authLoading } = useAuth();

  const runDebugTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Check environment variables
      results.envVars = {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'
      };

      // Test 2: Try to create Supabase client
      try {
        const supabase = createBrowserClient();
        results.supabaseClient = 'Created successfully';

        // Test 3: Try to get session
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          results.session = {
            hasSession: !!session,
            error: error?.message || null,
            userId: session?.user?.id || null,
            userEmail: session?.user?.email || null
          };
        } catch (sessionError: any) {
          results.session = {
            error: sessionError.message,
            hasSession: false
          };
        }

        // Test 4: Try to get user
        try {
          const { data: { user: currentUser }, error } = await supabase.auth.getUser();
          results.user = {
            hasUser: !!currentUser,
            error: error?.message || null,
            userId: currentUser?.id || null,
            userEmail: currentUser?.email || null
          };
        } catch (userError: any) {
          results.user = {
            error: userError.message,
            hasUser: false
          };
        }

        // Test 5: Check if profiles table is accessible
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

          results.profilesTable = {
            accessible: !error,
            error: error?.message || null
          };
        } catch (profileError: any) {
          results.profilesTable = {
            accessible: false,
            error: profileError.message
          };
        }

      } catch (clientError: any) {
        results.supabaseClient = `Failed: ${clientError.message}`;
      }

      // Test 6: Auth hook state
      results.authHook = {
        user: !!user,
        profile: !!profile,
        loading: authLoading,
        userEmail: user?.email || null,
        userId: user?.id || null
      };

    } catch (error: any) {
      results.globalError = error.message;
    }

    setDebugInfo(results);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">🔍 Authentication Debug</h1>

        <div className="space-y-4 mb-6">
          <Button onClick={runDebugTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Debug Tests'}
          </Button>
        </div>

        {Object.keys(debugInfo).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Debug Results:</h2>

            <div className="grid gap-4">
              {/* Environment Variables */}
              <Card className="p-4">
                <h3 className="font-semibold text-green-700 mb-2">Environment Variables</h3>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.envVars, null, 2)}
                </pre>
              </Card>

              {/* Supabase Client */}
              <Card className="p-4">
                <h3 className="font-semibold text-blue-700 mb-2">Supabase Client</h3>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.supabaseClient, null, 2)}
                </pre>
              </Card>

              {/* Session */}
              <Card className="p-4">
                <h3 className="font-semibold text-purple-700 mb-2">Session</h3>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.session, null, 2)}
                </pre>
              </Card>

              {/* User */}
              <Card className="p-4">
                <h3 className="font-semibold text-orange-700 mb-2">User</h3>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.user, null, 2)}
                </pre>
              </Card>

              {/* Profiles Table */}
              <Card className="p-4">
                <h3 className="font-semibold text-red-700 mb-2">Profiles Table</h3>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.profilesTable, null, 2)}
                </pre>
              </Card>

              {/* Auth Hook */}
              <Card className="p-4">
                <h3 className="font-semibold text-teal-700 mb-2">Auth Hook State</h3>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.authHook, null, 2)}
                </pre>
              </Card>

              {/* Global Error */}
              {debugInfo.globalError && (
                <Card className="p-4 border-red-200">
                  <h3 className="font-semibold text-red-700 mb-2">Global Error</h3>
                  <pre className="text-sm bg-red-50 p-3 rounded overflow-auto">
                    {debugInfo.globalError}
                  </pre>
                </Card>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t">
          <h3 className="font-semibold mb-2">Quick Actions:</h3>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => window.location.href = '/auth/login'}>
              Go to Login
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/auth/register'}>
              Go to Register
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
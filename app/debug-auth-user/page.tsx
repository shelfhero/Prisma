'use client';

/**
 * Debug Auth User - Check user status in both auth.users and profiles tables
 */

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserDebugInfo {
  email: string;
  authUser: any;
  profile: any;
  error?: string;
}

export default function DebugAuthUserPage() {
  const [email, setEmail] = useState('');
  const [debugInfo, setDebugInfo] = useState<UserDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkUser = async () => {
    if (!email) return;

    setIsLoading(true);
    setDebugInfo(null);

    try {
      const supabase = createBrowserClient();

      // Try to check if user exists in auth (this requires admin privileges in real apps)
      // For debugging, we'll try to sign in with a dummy password to see if user exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-for-testing'
      });

      console.log('Sign in attempt:', { signInData, signInError });

      // Check profile table (this should work even without auth)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      console.log('Profile check:', { profile, profileError });

      // Try to get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', { user, userError });

      setDebugInfo({
        email,
        authUser: signInError?.message || 'Sign-in attempted (error expected)',
        profile: profile || (profileError ? `Error: ${profileError.message}` : 'No profile found'),
        error: signInError?.message
      });

    } catch (error: any) {
      console.error('Debug error:', error);
      setDebugInfo({
        email,
        authUser: null,
        profile: null,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUserFromAuth = async () => {
    if (!email) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to attempt to delete the user ${email} from the auth system? This is a dangerous operation!`
    );

    if (!confirmDelete) return;

    try {
      // This would require admin privileges - we can't actually do this from client
      alert('This operation requires admin privileges and should be done from Supabase dashboard');
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const createProfile = async () => {
    if (!email) return;

    try {
      const supabase = createBrowserClient();

      // Try to create a profile (this will fail without a valid user ID)
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: 'dummy-id', // This won't work without a real UUID from auth
          email: email,
          full_name: 'Debug User',
          role: 'user'
        });

      if (error) {
        alert(`Profile creation failed: ${error.message}`);
      } else {
        alert('Profile created successfully');
        checkUser(); // Refresh the debug info
      }
    } catch (error: any) {
      console.error('Profile creation error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🔍 Debug Auth User Status
        </h1>
        <p className="text-gray-600">
          Check if a user exists in auth.users and/or profiles tables
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />

        <Button
          onClick={checkUser}
          loading={isLoading}
          disabled={!email || isLoading}
        >
          Check User Status
        </Button>
      </div>

      {debugInfo && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Debug Results for: {debugInfo.email}</h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Auth User Status:</span>
                <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(debugInfo.authUser, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-medium text-gray-700">Profile Data:</span>
                <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(debugInfo.profile, null, 2)}
                </pre>
              </div>

              {debugInfo.error && (
                <div>
                  <span className="font-medium text-red-700">Error:</span>
                  <p className="text-red-600">{debugInfo.error}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={createProfile}
              className="text-xs"
            >
              Try Create Profile
            </Button>

            <Button
              variant="destructive"
              onClick={deleteUserFromAuth}
              className="text-xs"
            >
              Delete from Auth (Admin Only)
            </Button>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">💡 How to fix "User already exists" issue:</h4>
        <div className="text-sm text-yellow-700 space-y-2">
          <p>1. <strong>Check Supabase Dashboard:</strong> Go to Authentication → Users to see if the user exists</p>
          <p>2. <strong>Check Database:</strong> Look at both auth.users and public.profiles tables</p>
          <p>3. <strong>If user exists in auth but not profiles:</strong> Create the profile manually or via trigger</p>
          <p>4. <strong>If user should be deleted:</strong> Delete from Supabase Auth dashboard (admin only)</p>
          <p>5. <strong>If registration should work:</strong> The user should login instead of register</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">🛠️ Recommended Solutions:</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>Option 1:</strong> Add "Already have an account?" link to registration with better messaging</p>
          <p><strong>Option 2:</strong> Implement "Forgot Password" flow for existing users</p>
          <p><strong>Option 3:</strong> Add database trigger to auto-create profiles when auth users are created</p>
          <p><strong>Option 4:</strong> Improve error messaging to guide users to login instead</p>
        </div>
      </div>
    </div>
  );
}
/**
 * Debug Registration Page
 * Test registration with detailed error logging
 */

'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-simple';

export default function DebugRegisterPage() {
  const [email, setEmail] = useState('test@prizma.bg');
  const [password, setPassword] = useState('TestPassword123!');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (step: string, success: boolean, data?: any, error?: any) => {
    const result = {
      step,
      success,
      data,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [...prev, result]);
    console.log(`${success ? '✅' : '❌'} ${step}:`, result);
  };

  const testRegistration = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      // Step 1: Create Supabase client
      addResult('Създаване на Supabase клиент', true);
      const supabase = createBrowserClient();

      // Step 2: Test basic connection
      try {
        const { error: connectionError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        if (connectionError) {
          addResult('Тест на връзката с базата данни', false, null, connectionError);
        } else {
          addResult('Тест на връзката с базата данни', true);
        }
      } catch (connErr) {
        addResult('Тест на връзката с базата данни', false, null, connErr);
      }

      // Step 3: Attempt registration
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: 'Test User'
            }
          }
        });

        if (signUpError) {
          addResult('Регистрация на потребител', false, null, signUpError);
          return;
        } else {
          addResult('Регистрация на потребител', true, {
            user: signUpData.user?.id,
            email: signUpData.user?.email,
            needsConfirmation: !signUpData.session
          });
        }

        // Step 4: Create profile (if user was created)
        if (signUpData.user) {
          try {
            const profile = {
              id: signUpData.user.id,
              email: signUpData.user.email!,
              full_name: signUpData.user.user_metadata?.full_name || 'Test User',
              avatar_url: null,
              role: 'user' as const
            };

            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .insert(profile)
              .select()
              .single();

            if (profileError) {
              addResult('Създаване на профил', false, null, profileError);
            } else {
              addResult('Създаване на профил', true, profileData);
            }
          } catch (profileErr) {
            addResult('Създаване на профил', false, null, profileErr);
          }
        }

        // Step 5: Check current session
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            addResult('Проверка на сесията', false, null, sessionError);
          } else {
            addResult('Проверка на сесията', true, {
              hasSession: !!session,
              userId: session?.user?.id
            });
          }
        } catch (sessionErr) {
          addResult('Проверка на сесията', false, null, sessionErr);
        }

      } catch (authErr) {
        addResult('Регистрация на потребител', false, null, authErr);
      }

    } catch (err) {
      addResult('Общ тест', false, null, err);
    } finally {
      setIsLoading(false);
    }
  };

  const testSupabaseConfig = async () => {
    setResults([]);

    // Check environment variables
    const envCheck = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };

    addResult('Проверка на environment variables', envCheck.hasUrl && envCheck.hasKey, envCheck);

    // Test client creation
    try {
      const supabase = createBrowserClient();
      addResult('Създаване на клиент', true, { clientCreated: true });

      // Test auth configuration
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        addResult('Проверка на auth конфигурацията', !error, { user: user?.id }, error);
      } catch (authErr) {
        addResult('Проверка на auth конфигурацията', false, null, authErr);
      }

    } catch (clientErr) {
      addResult('Създаване на клиент', false, null, clientErr);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🐛 Debug Registration
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Test Registration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={testSupabaseConfig}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Test Supabase Config
            </button>
            <button
              onClick={testRegistration}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Registration'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Test Results
          </h2>

          {results.length === 0 ? (
            <p className="text-gray-500">No tests run yet. Click a button above to start.</p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.success
                      ? 'bg-green-50 border-green-400'
                      : 'bg-red-50 border-red-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="mr-2">
                          {result.success ? '✅' : '❌'}
                        </span>
                        <span className={`font-medium ${
                          result.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {result.step}
                        </span>
                      </div>

                      {result.error && (
                        <div className="mt-2 text-sm text-red-700">
                          <strong>Error:</strong> {result.error}
                        </div>
                      )}

                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">
                            Show Details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 ml-4">
                      {new Date(result.timestamp).toLocaleTimeString('bg-BG')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">
            Expected Issues:
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Email confirmation might be required in Supabase settings</li>
            <li>• Profiles table might not exist or have wrong permissions</li>
            <li>• RLS policies might be blocking the insert</li>
            <li>• Supabase project might not be properly configured</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
/**
 * Environment Variables Debug Page
 * Quick check for environment variable loading
 */

'use client';

import { useEffect, useState } from 'react';

export default function DebugEnvPage() {
  const [envInfo, setEnvInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      // Don't expose the service key in client-side code
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    };

    setEnvInfo(info);
  }, []);

  const testSupabaseClient = async () => {
    try {
      const { createBrowserClient } = await import('@/lib/supabase-simple');
      const client = createBrowserClient();
      console.log('✅ Supabase client created successfully');

      // Test a simple query
      const { data, error } = await client
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Supabase query error:', error);
      } else {
        console.log('✅ Supabase query successful');
      }
    } catch (error) {
      console.error('❌ Supabase client creation failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔍 Environment Variables Debug
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Environment Status
          </h2>

          {envInfo ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>NODE_ENV:</strong> {envInfo.NODE_ENV || 'не е зададен'}
                </div>
                <div>
                  <strong>Has Supabase URL:</strong> {envInfo.hasSupabaseUrl ? '✅' : '❌'}
                </div>
                <div>
                  <strong>Has Anon Key:</strong> {envInfo.hasAnonKey ? '✅' : '❌'}
                </div>
                <div>
                  <strong>URL Length:</strong> {envInfo.urlLength}
                </div>
                <div>
                  <strong>Key Length:</strong> {envInfo.keyLength}
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">Raw Values (masked):</h3>
                <div className="font-mono text-sm space-y-1">
                  <div>
                    <strong>URL:</strong> {envInfo.NEXT_PUBLIC_SUPABASE_URL ?
                      envInfo.NEXT_PUBLIC_SUPABASE_URL.slice(0, 20) + '...' :
                      'НЕ Е ЗАДАДЕН'
                    }
                  </div>
                  <div>
                    <strong>Key:</strong> {envInfo.NEXT_PUBLIC_SUPABASE_ANON_KEY ?
                      envInfo.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20) + '...' :
                      'НЕ Е ЗАДАДЕН'
                    }
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>Зареждане...</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Supabase Client Test
          </h2>

          <button
            onClick={testSupabaseClient}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Supabase Client
          </button>

          <div className="mt-4 text-sm text-gray-600">
            Отворете Developer Console (F12) за да видите резултатите от теста.
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">
            Troubleshooting Tips:
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Уверете се, че .env.local файлът съществува в root директорията</li>
            <li>• Проверете дали променливите започват с NEXT_PUBLIC_</li>
            <li>• Рестартирайте development сървъра след промени в .env.local</li>
            <li>• Проверете дали няма скрити символи или интервали в стойностите</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
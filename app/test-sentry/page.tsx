'use client'

import { useState } from 'react'

export default function TestSentryPage() {
  const [errorThrown, setErrorThrown] = useState(false)

  const throwError = () => {
    setErrorThrown(true)
    // @ts-ignore - Intentional error for Sentry testing
    myUndefinedFunction()
  }

  const throwAsyncError = async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    throw new Error('🧪 Test Async Sentry Error - This is intentional!')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🧪 Sentry Error Tracking Test
          </h1>

          <p className="text-gray-600 mb-8">
            Click the buttons below to test different types of errors.
            Check your Sentry dashboard to see if they're captured.
          </p>

          <div className="space-y-4">
            {/* Synchronous Error */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                1. Synchronous Error
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Throws an immediate error that should be caught by Sentry.
              </p>
              <button
                onClick={throwError}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Throw Sync Error
              </button>
            </div>

            {/* Async Error */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                2. Async Error
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Throws an error in an async function.
              </p>
              <button
                onClick={() => throwAsyncError().catch(err => {
                  console.error('Async error:', err)
                  throw err
                })}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Throw Async Error
              </button>
            </div>

            {/* Console Error */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                3. Console Error
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Logs an error to console (may not be captured by Sentry).
              </p>
              <button
                onClick={() => console.error('🧪 Test Console Error')}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Log Error
              </button>
            </div>

            {/* API Error Simulation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                4. API Error Simulation
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Simulates a failed API request.
              </p>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/nonexistent-endpoint')
                    if (!response.ok) {
                      throw new Error(`API Error: ${response.status} ${response.statusText}`)
                    }
                  } catch (err) {
                    console.error('API Error:', err)
                    throw err
                  }
                }}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Trigger API Error
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 How to Test:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Make sure you have <code className="bg-blue-100 px-2 py-1 rounded">NEXT_PUBLIC_SENTRY_DSN</code> in your <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code></li>
              <li>Click any of the buttons above to trigger an error</li>
              <li>Go to your Sentry dashboard: <a href="https://sentry.io" target="_blank" className="text-blue-600 hover:underline">https://sentry.io</a></li>
              <li>Check the "Issues" tab for the errors</li>
              <li>Verify error details, stack traces, and context</li>
            </ol>
          </div>

          {/* Status */}
          {errorThrown && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                ✅ Error thrown! Check your Sentry dashboard.
              </p>
            </div>
          )}

          {/* Environment Info */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              ⚙️ Environment Info:
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
              <p><strong>Sentry DSN:</strong> {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Configured' : '❌ Not configured'}</p>
              <p className="text-xs text-gray-500 mt-2">
                Note: Sentry only sends errors in production by default.
                For testing, you may need to temporarily enable it in development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

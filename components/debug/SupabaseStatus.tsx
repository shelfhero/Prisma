/**
 * Supabase Status Component
 * Quick status check widget for development
 */

'use client';

import { useState, useEffect } from 'react';
import { quickHealthCheck, logDebugInfo } from '@/lib/debug-supabase';

interface StatusProps {
  minimal?: boolean;
}

export default function SupabaseStatus({ minimal = false }: StatusProps) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const healthy = await quickHealthCheck();
      setIsHealthy(healthy);
      setLastCheck(new Date());

      if (process.env.NODE_ENV === 'development') {
        logDebugInfo();
      }
    } catch (error) {
      setIsHealthy(false);
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
  }, []);

  if (minimal) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isHealthy === null ? 'bg-gray-400' :
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className="text-xs text-gray-600">
          {isHealthy === null ? 'Проверява...' :
           isHealthy ? 'DB OK' : 'DB Грешка'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">
          Supabase статус
        </h4>
        <button
          onClick={performHealthCheck}
          disabled={isChecking}
          className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
        >
          {isChecking ? '🔄' : '↻'} Провери
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${
          isHealthy === null ? 'bg-gray-400 animate-pulse' :
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`}></div>

        <div className="flex-1">
          <div className={`text-sm font-medium ${
            isHealthy === null ? 'text-gray-600' :
            isHealthy ? 'text-green-800' : 'text-red-800'
          }`}>
            {isHealthy === null ? 'Проверява свързването...' :
             isHealthy ? 'Свързан с Supabase' : 'Грешка при свързване'}
          </div>

          {lastCheck && (
            <div className="text-xs text-gray-500">
              Последна проверка: {lastCheck.toLocaleTimeString('bg-BG')}
            </div>
          )}
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1">
            <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}</div>
            <div>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
/**
 * Debug Script for Supabase Connection
 * Quick debugging tools for testing Supabase functionality
 */

import { createBrowserClient } from './supabase-simple';

export interface DebugResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function debugSupabaseConnection(): Promise<DebugResult[]> {
  const results: DebugResult[] = [];

  try {
    // Test 1: Create client
    let supabase: any;
    try {
      supabase = createBrowserClient();
      results.push({
        test: 'Създаване на Supabase клиент',
        success: true,
        message: 'Клиентът е създаден успешно'
      });
    } catch (error: any) {
      results.push({
        test: 'Създаване на Supabase клиент',
        success: false,
        message: 'Грешка при създаване на клиента',
        error: error.message
      });
      return results;
    }

    // Test 2: Check environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };

    const missingVars = Object.entries(envVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    results.push({
      test: 'Проверка на environment variables',
      success: missingVars.length === 0,
      message: missingVars.length === 0
        ? 'Всички променливи са налични'
        : `Липсват променливи: ${missingVars.join(', ')}`,
      data: {
        url: envVars.NEXT_PUBLIC_SUPABASE_URL ? 'налична' : 'липсва',
        key: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'налична' : 'липсва'
      }
    });

    // Test 3: Simple query
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      results.push({
        test: 'Проста заявка към базата данни',
        success: !error,
        message: error ? `Грешка при заявка: ${error.message}` : 'Заявката е успешна',
        data: data,
        error: error?.message
      });
    } catch (error: any) {
      results.push({
        test: 'Проста заявка към базата данни',
        success: false,
        message: 'Грешка при изпълнение на заявката',
        error: error.message
      });
    }

    // Test 4: Auth state
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      results.push({
        test: 'Проверка на автентикацията',
        success: !error,
        message: user
          ? `Автентикиран като: ${user.email}`
          : 'Не сте автентикиран',
        data: {
          authenticated: !!user,
          email: user?.email || null
        },
        error: error?.message
      });
    } catch (error: any) {
      results.push({
        test: 'Проверка на автентикацията',
        success: false,
        message: 'Грешка при проверка на автентикацията',
        error: error.message
      });
    }

    // Test 5: Tables access
    const tables = ['profiles', 'receipts', 'items', 'categories', 'retailers'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        results.push({
          test: `Достъп до таблица '${table}'`,
          success: !error,
          message: error
            ? `Грешка при достъп: ${error.message}`
            : `Успешен достъп (${data?.length || 0} записа)`,
          data: { hasData: (data?.length || 0) > 0 },
          error: error?.message
        });
      } catch (error: any) {
        results.push({
          test: `Достъп до таблица '${table}'`,
          success: false,
          message: 'Неочаквана грешка',
          error: error.message
        });
      }
    }

  } catch (error: any) {
    results.push({
      test: 'Общ тест на Supabase',
      success: false,
      message: 'Критична грешка при тестването',
      error: error.message
    });
  }

  return results;
}

export async function quickHealthCheck(): Promise<boolean> {
  try {
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}

export function logDebugInfo() {
  console.log('🔍 Призма Debug Info');
  console.log('='.repeat(30));
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
  console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  console.log('User Agent:', typeof window !== 'undefined' ? navigator.userAgent : 'Server');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(30));
}

export default debugSupabaseConnection;
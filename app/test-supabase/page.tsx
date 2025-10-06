/**
 * Supabase Integration Test Page for Призма
 * Comprehensive testing interface for all Supabase features
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import ErrorMessage from '@/components/ui/ErrorMessage';
import PrizmaTestRunner, {
  DatabaseTester,
  AuthTester,
  StorageTester,
  ReceiptFlowTester,
  TestDataCleanup,
  TestSuite,
  TestResult
} from '@/lib/test-utils';
import BulgarianTextTest from '@/components/test/BulgarianTextTest';

export default function SupabaseTestPage() {
  const { user, loading: authLoading } = useAuth();
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [testUserExists, setTestUserExists] = useState<boolean>(false);

  // Test credentials for registration/login tests
  const [testEmail, setTestEmail] = useState('test@prizma.bg');
  const [testPassword, setTestPassword] = useState('TestPassword123!');

  const runner = new PrizmaTestRunner();
  const dbTester = new DatabaseTester();
  const authTester = new AuthTester();
  const storageTester = new StorageTester();
  const receiptTester = new ReceiptFlowTester();
  const cleanup = new TestDataCleanup();

  const updateCurrentTest = (testName: string) => {
    setCurrentTest(testName);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setError(null);
    setTestResults([]);

    try {
      // Test 1: Database Connection and Access
      runner.startSuite('🗄️ Тестове на базата данни');

      await runner.runTest('Свързване с базата данни', async () => {
        updateCurrentTest('Тестване на връзката с базата данни...');
        return await dbTester.testConnection();
      });

      await runner.runTest('Достъп до таблици', async () => {
        updateCurrentTest('Проверка на достъпа до таблици...');
        return await dbTester.testTableAccess();
      });

      if (user) {
        await runner.runTest('RLS политики', async () => {
          updateCurrentTest('Тестване на RLS политиките...');
          return await dbTester.testRLSPolicies(user.id);
        });
      }

      const dbSuite = runner.finishSuite();
      setTestResults(prev => [...prev, dbSuite]);

      // Test 2: Authentication Flow
      runner.startSuite('🔐 Тестове на автентикацията');

      await runner.runTest('Текущ потребител', async () => {
        updateCurrentTest('Проверка на текущия потребител...');
        return await authTester.getCurrentUser();
      });

      if (!user) {
        await runner.runTest('Регистрация на тестов потребител', async () => {
          updateCurrentTest('Регистриране на тестов потребител...');
          return await authTester.testRegistration(testEmail, testPassword);
        });

        await runner.runTest('Вход с тестов потребител', async () => {
          updateCurrentTest('Вход с тестови данни...');
          return await authTester.testLogin(testEmail, testPassword);
        });
      }

      const authSuite = runner.finishSuite();
      setTestResults(prev => [...prev, authSuite]);

      // Test 3: Storage
      runner.startSuite('📁 Тестове на файловото съхранение');

      await runner.runTest('Достъп до storage buckets', async () => {
        updateCurrentTest('Проверка на достъпа до storage...');
        return await storageTester.testBucketAccess();
      });

      if (user) {
        await runner.runTest('Качване на тестов файл', async () => {
          updateCurrentTest('Качване на тестов файл...');
          const testFile = storageTester.createTestFile();
          return await storageTester.testFileUpload(testFile, user.id);
        });
      }

      const storageSuite = runner.finishSuite();
      setTestResults(prev => [...prev, storageSuite]);

      // Test 4: Receipt Flow (only if authenticated)
      if (user) {
        runner.startSuite('🧾 Тестове на касовите бележки');

        let testReceiptResult: any;
        await runner.runTest('Създаване на тестова бележка', async () => {
          updateCurrentTest('Създаване на тестова бележка...');
          testReceiptResult = await receiptTester.createTestReceipt(user.id);
          return testReceiptResult;
        });

        await runner.runTest('Заявка за бележки с релации', async () => {
          updateCurrentTest('Тестване на заявки за бележки...');
          return await receiptTester.testReceiptQuery(user.id);
        });

        await runner.runTest('Изчистване на тестови данни', async () => {
          updateCurrentTest('Изчистване на тестовите данни...');
          return await receiptTester.cleanupTestData(user.id);
        });

        const receiptSuite = runner.finishSuite();
        setTestResults(prev => [...prev, receiptSuite]);
      }

      updateCurrentTest('');
    } catch (err: any) {
      setError(`Грешка при изпълнение на тестовете: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getOverallStats = () => {
    const totals = testResults.reduce(
      (acc, suite) => ({
        total: acc.total + suite.summary.total,
        passed: acc.passed + suite.summary.passed,
        failed: acc.failed + suite.summary.failed
      }),
      { total: 0, passed: 0, failed: 0 }
    );

    return totals;
  };

  const downloadReport = () => {
    const report = runner.generateReport();
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prizma-test-report-${new Date().toISOString().slice(0, 19)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCleanupTestData = async () => {
    if (!user) {
      setCleanupResult('❌ Трябва да сте автентикиран за да изчистите данни');
      return;
    }

    setIsCleaningUp(true);
    setCleanupResult(null);

    try {
      const result = await cleanup.cleanupAll(user.id);

      if (result.success) {
        setCleanupResult(`✅ ${result.message}\n• Бележки: ${result.receipts.deleted}\n• Файлове: ${result.files.deleted}`);
      } else {
        setCleanupResult(`⚠️ Частично изчистване:\n${result.errors.join('\n')}`);
      }
    } catch (error: any) {
      setCleanupResult(`❌ Грешка: ${error.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const checkTestUserExists = async () => {
    try {
      const response = await fetch('/api/test/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await response.json();
      setTestUserExists(data.exists || false);
    } catch (error) {
      console.error('Error checking user:', error);
      setTestUserExists(false);
    }
  };

  const handleDeleteTestUser = async () => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете тестовия потребител ${testEmail}?\n\nТова действие е необратимо!`)) {
      return;
    }

    setIsCleaningUp(true);
    setCleanupResult(null);

    try {
      const result = await cleanup.deleteTestUser(testEmail);
      setCleanupResult(`✅ ${result.message}`);
      setTestUserExists(false); // Update state after deletion
    } catch (error: any) {
      setCleanupResult(`❌ Грешка: ${error.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Тестове на Supabase интеграцията
          </h1>
          <p className="text-gray-600">
            Комплексно тестване на всички Supabase функции за Призма
          </p>
        </div>

        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Статус на автентикацията
          </h3>
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800">
                  Автентикиран като: {user.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-800">
                  Не сте автентикиран - някои тестове ще бъдат пропуснати
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Test Configuration */}
        {!user && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Конфигурация за тестване
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тестов имейл
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тестова парола
                </label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Контрол на тестовете
              </h3>
              {currentTest && (
                <p className="text-sm text-blue-600 mt-1">
                  {currentTest}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="relative"
              >
                {isRunning ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Изпълняване...
                  </>
                ) : (
                  'Стартиране на всички тестове'
                )}
              </Button>
              {testResults.length > 0 && (
                <Button
                  variant="outline"
                  onClick={downloadReport}
                  disabled={isRunning}
                >
                  Сваляне на отчет
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorMessage
              message={error}
              onRetry={() => setError(null)}
            />
          </div>
        )}

        {/* Overall Stats */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Общ резултат
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                const stats = getOverallStats();
                return (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                      <div className="text-sm text-gray-600">Общо тестове</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                      <div className="text-sm text-gray-600">Успешни</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                      <div className="text-sm text-gray-600">Неуспешни</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.map((suite, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {suite.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-green-600">
                  ✅ {suite.summary.passed}
                </span>
                <span className="text-red-600">
                  ❌ {suite.summary.failed}
                </span>
                <span className="text-gray-500">
                  {suite.summary.duration}ms
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {suite.tests.map((test, testIndex) => (
                <div
                  key={testIndex}
                  className={`p-4 rounded-lg border ${
                    test.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="mr-2">
                          {test.success ? '✅' : '❌'}
                        </span>
                        <span className={`font-medium ${
                          test.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {test.message}
                        </span>
                      </div>

                      {test.error && (
                        <div className="mt-2 text-sm text-red-700">
                          <strong>Грешка:</strong> {test.error}
                        </div>
                      )}

                      {test.details && test.success && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">
                            Покажи детайли
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 ml-4">
                      {new Date(test.timestamp).toLocaleTimeString('bg-BG')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Cleanup Tools */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🧹 Инструменти за изчистване
          </h3>

          <div className="space-y-4">
            {/* Cleanup test data */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Изчистване на тестови данни</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Изтрива всички тестови бележки и файлове създадени през последните 24 часа
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleCleanupTestData}
                disabled={isCleaningUp || !user}
                className="ml-4"
              >
                {isCleaningUp ? 'Изчистване...' : 'Изчисти данни'}
              </Button>
            </div>

            {/* Delete test user */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">Изтриване на тестов потребител</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  За да тествате регистрацията отново, променете тестовия email на нов (напр. test2@prizma.bg, test3@prizma.bg)
                  или използвайте Supabase Dashboard за да изтриете ръчно потребителя {testEmail}
                </p>
              </div>
            </div>

            {/* Cleanup result */}
            {cleanupResult && (
              <div className={`p-4 rounded-lg ${
                cleanupResult.startsWith('✅')
                  ? 'bg-green-50 border border-green-200'
                  : cleanupResult.startsWith('⚠️')
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {cleanupResult}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Bulgarian Text Test */}
        <BulgarianTextTest />

        {/* Instructions */}
        {testResults.length === 0 && !isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Инструкции за тестване
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Натиснете "Стартиране на всички тестове" за да започнете</p>
              <p>• Тестовете ще проверят всички аспекти на Supabase интеграцията</p>
              <p>• За пълно тестване се нуждаете от автентикация</p>
              <p>• Резултатите могат да бъдат свалени като текстов файл</p>
              <p>• Всички тестови данни се изчистват автоматично</p>
              <p>• Проверете българския текст в компонента по-горе</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
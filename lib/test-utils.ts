/**
 * Test Utilities for Призма Receipt App
 * Comprehensive testing framework for Supabase integration
 */

import { createBrowserClient, createAdminClient } from './supabase-simple';
import type { Database } from '@/types/database';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

export class PrizmaTestRunner {
  private results: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  private log(level: 'info' | 'success' | 'error' | 'warn', message: string, details?: any) {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌',
      warn: '⚠️'
    }[level];

    console.log(`${prefix} [${timestamp}] ${message}`);
    if (details) {
      console.log('   Детайли:', details);
    }
  }

  startSuite(name: string) {
    this.currentSuite = {
      name,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: Date.now()
      }
    };
    this.log('info', `Започване на тестов пакет: ${name}`);
  }

  async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    if (!this.currentSuite) {
      throw new Error('Няма активен тестов пакет');
    }

    const startTime = Date.now();
    this.log('info', `Изпълняване на тест: ${testName}`);

    try {
      const result = await testFn();
      const testResult: TestResult = {
        success: true,
        message: `${testName} - УСПЕШЕН`,
        details: result,
        timestamp: new Date().toISOString()
      };

      this.currentSuite.tests.push(testResult);
      this.currentSuite.summary.passed++;
      this.log('success', testResult.message, result);
      return testResult;
    } catch (error: any) {
      const testResult: TestResult = {
        success: false,
        message: `${testName} - НЕУСПЕШЕН`,
        error: error.message,
        details: error,
        timestamp: new Date().toISOString()
      };

      this.currentSuite.tests.push(testResult);
      this.currentSuite.summary.failed++;
      this.log('error', testResult.message, error);
      return testResult;
    } finally {
      this.currentSuite.summary.total++;
      const duration = Date.now() - startTime;
      this.log('info', `Тест завършен за ${duration}ms`);
    }
  }

  finishSuite(): TestSuite {
    if (!this.currentSuite) {
      throw new Error('Няма активен тестов пакет');
    }

    this.currentSuite.summary.duration = Date.now() - this.currentSuite.summary.duration;
    this.results.push(this.currentSuite);

    const { passed, failed, total, duration } = this.currentSuite.summary;
    this.log('info', `Пакет завършен: ${passed}/${total} успешни тестове за ${duration}ms`);

    if (failed > 0) {
      this.log('warn', `${failed} неуспешни тестове`);
    }

    const suite = this.currentSuite;
    this.currentSuite = null;
    return suite;
  }

  getAllResults(): TestSuite[] {
    return this.results;
  }

  generateReport(): string {
    let report = '\n📊 ОТЧЕТ ЗА ТЕСТОВЕТЕ НА ПРИЗМА\n';
    report += '=' .repeat(50) + '\n\n';

    for (const suite of this.results) {
      report += `📦 ${suite.name}\n`;
      report += `   Общо: ${suite.summary.total} | Успешни: ${suite.summary.passed} | Неуспешни: ${suite.summary.failed}\n`;
      report += `   Време: ${suite.summary.duration}ms\n\n`;

      for (const test of suite.tests) {
        const status = test.success ? '✅' : '❌';
        report += `   ${status} ${test.message}\n`;
        if (!test.success && test.error) {
          report += `      Грешка: ${test.error}\n`;
        }
      }
      report += '\n';
    }

    return report;
  }
}

// Database testing utilities
export class DatabaseTester {
  private supabase = createBrowserClient();
  private adminClient = createAdminClient();

  async testConnection(): Promise<any> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`Грешка при свързване с базата данни: ${error.message}`);
    }

    return {
      connected: true,
      message: 'Успешно свързване с Supabase'
    };
  }

  async testTableAccess(): Promise<any> {
    const tables = ['profiles', 'receipts', 'items', 'categories', 'retailers'];
    const results: any = {};

    for (const table of tables) {
      try {
        const { data, error } = await this.supabase
          .from(table as any)
          .select('*')
          .limit(1);

        results[table] = {
          accessible: !error,
          error: error?.message,
          hasData: data && data.length > 0
        };
      } catch (err: any) {
        results[table] = {
          accessible: false,
          error: err.message
        };
      }
    }

    return results;
  }

  async testRLSPolicies(userId: string): Promise<any> {
    // Test that user can only access their own data
    const { data: ownProfiles, error: ownError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    // Test that user cannot access other users' receipts
    const { data: receipts, error: receiptsError } = await this.supabase
      .from('receipts')
      .select('*')
      .neq('user_id', userId)
      .limit(1);

    return {
      canAccessOwnProfile: !ownError && ownProfiles?.length === 1,
      cannotAccessOthersReceipts: receiptsError?.message?.includes('RLS') || receipts?.length === 0,
      ownProfileError: ownError?.message,
      receiptsError: receiptsError?.message
    };
  }
}

// Authentication testing utilities
export class AuthTester {
  private supabase = createBrowserClient();

  async testRegistration(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw new Error(`Грешка при регистрация: ${error.message}`);
    }

    return {
      user: data.user,
      session: data.session,
      needsConfirmation: !data.session
    };
  }

  async testLogin(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Грешка при вход: ${error.message}`);
    }

    return {
      user: data.user,
      session: data.session,
      isAuthenticated: !!data.session
    };
  }

  async testLogout(): Promise<any> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error(`Грешка при изход: ${error.message}`);
    }

    return {
      loggedOut: true,
      message: 'Успешен изход'
    };
  }

  async getCurrentUser(): Promise<any> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error) {
      throw new Error(`Грешка при получаване на потребител: ${error.message}`);
    }

    return {
      user,
      isAuthenticated: !!user
    };
  }
}

// Storage testing utilities
export class StorageTester {
  private supabase = createBrowserClient();

  async testBucketAccess(): Promise<any> {
    const { data: buckets, error } = await this.supabase.storage.listBuckets();

    if (error) {
      throw new Error(`Грешка при достъп до storage: ${error.message}`);
    }

    return {
      bucketsCount: buckets?.length || 0,
      buckets: buckets?.map((b: any) => b.name) || [],
      hasReceiptsBucket: buckets?.some((b: any) => b.name === 'receipts') || false
    };
  }

  async testFileUpload(file: File, path: string): Promise<any> {
    const { data, error } = await this.supabase.storage
      .from('receipts')
      .upload(path, file);

    if (error) {
      throw new Error(`Грешка при качване на файл: ${error.message}`);
    }

    return {
      uploaded: true,
      path: data.path,
      fullPath: data.fullPath
    };
  }

  async testFileDownload(path: string): Promise<any> {
    const { data, error } = await this.supabase.storage
      .from('receipts')
      .download(path);

    if (error) {
      throw new Error(`Грешка при сваляне на файл: ${error.message}`);
    }

    return {
      downloaded: true,
      size: data.size,
      type: data.type
    };
  }

  // Create a test file for upload testing
  createTestFile(): File {
    const content = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Тестов файл за Призма'
    });

    return new File([content], 'test-receipt.json', {
      type: 'application/json'
    });
  }
}

// Receipt flow testing utilities
export class ReceiptFlowTester {
  private supabase = createBrowserClient();
  private adminClient = createAdminClient();

  async createTestReceipt(userId: string): Promise<any> {
    // First, ensure we have test categories and retailers
    const { data: category } = await this.adminClient
      .from('categories')
      .upsert({
        name: 'Тестова категория',
        description: 'Категория за тестване'
      }, { onConflict: 'name' })
      .select()
      .single();

    const { data: retailer } = await this.adminClient
      .from('retailers')
      .upsert({
        name: 'Тестов магазин',
        address: 'Тестов адрес'
      }, { onConflict: 'name' })
      .select()
      .single();

    // Create test receipt
    const { data: receipt, error: receiptError } = await this.supabase
      .from('receipts')
      .insert({
        user_id: userId,
        retailer_id: retailer?.id,
        total_amount: 25.50,
        currency: 'BGN',
        purchased_at: new Date().toISOString(),
        receipt_number: `TEST-${Date.now()}`,
        raw_text: 'Тестова бележка\nПродукт 1: 10.00 лв\nПродукт 2: 15.50 лв'
      })
      .select()
      .single();

    if (receiptError) {
      throw new Error(`Грешка при създаване на бележка: ${receiptError.message}`);
    }

    // Add test items
    const { data: items, error: itemsError } = await this.supabase
      .from('items')
      .insert([
        {
          receipt_id: receipt.id,
          product_name: 'Тестов продукт 1',
          category_id: category?.id,
          price: 10.00,
          quantity: 1
        },
        {
          receipt_id: receipt.id,
          product_name: 'Тестов продукт 2',
          category_id: category?.id,
          price: 15.50,
          quantity: 1
        }
      ])
      .select();

    if (itemsError) {
      throw new Error(`Грешка при добавяне на продукти: ${itemsError.message}`);
    }

    return {
      receipt,
      items,
      category,
      retailer,
      totalItems: items?.length || 0
    };
  }

  async testReceiptQuery(userId: string): Promise<any> {
    const { data: receipts, error } = await this.supabase
      .from('receipts')
      .select(`
        id,
        total_amount,
        currency,
        purchased_at,
        retailer:retailers(name),
        items(id, product_name, price, category:categories(name))
      `)
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (error) {
      throw new Error(`Грешка при заявка за бележки: ${error.message}`);
    }

    return {
      receiptsCount: receipts?.length || 0,
      receipts: receipts?.slice(0, 3), // Show first 3 for testing
      hasRelatedData: receipts?.some((r: any) => r.retailer && r.items?.length > 0)
    };
  }

  async cleanupTestData(userId: string): Promise<any> {
    // Delete test receipts and related data
    const { error: deleteError } = await this.supabase
      .from('receipts')
      .delete()
      .eq('user_id', userId)
      .ilike('receipt_number', 'TEST-%');

    if (deleteError) {
      throw new Error(`Грешка при изчистване на тестови данни: ${deleteError.message}`);
    }

    return {
      cleaned: true,
      message: 'Тестовите данни са изчистени успешно'
    };
  }
}

export default PrizmaTestRunner;
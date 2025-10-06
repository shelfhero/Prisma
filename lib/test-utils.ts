/**
 * Test Utilities for Призма Receipt App
 * Comprehensive testing framework for Supabase integration
 */

import { createBrowserClient } from './supabase-simple';
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

    const availableBuckets = buckets?.map((b: any) => b.name) || [];
    const hasReceiptsBucket = availableBuckets.includes('receipts') || availableBuckets.includes('receipt-images');

    return {
      bucketsCount: buckets?.length || 0,
      buckets: availableBuckets,
      hasReceiptsBucket,
      message: hasReceiptsBucket
        ? 'Storage е достъпен'
        : 'Предупреждение: Няма receipts bucket'
    };
  }

  async testFileUpload(file: File, userId: string): Promise<any> {
    // Use receipts bucket (more permissive for testing)
    const bucketName = 'receipts';
    const testReceiptId = 'test-' + Date.now();
    const path = `${userId}/${testReceiptId}/test-receipt.png`;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

    if (error) {
      throw new Error(`Грешка при качване на файл: ${error.message}`);
    }

    return {
      uploaded: true,
      path: data.path,
      bucket: bucketName,
      message: 'Файлът е качен успешно'
    };
  }

  async testFileDownload(path: string, bucketName: string = 'receipt-images'): Promise<any> {
    const { data, error } = await this.supabase.storage
      .from(bucketName)
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

  // Create a test PNG image file for upload testing
  createTestFile(): File {
    // Create a minimal 1x1 PNG image (base64 decoded)
    const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const byteString = atob(pngData);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    const file = new File([uint8Array], 'test-receipt.png', {
      type: 'image/png'
    });

    console.log('[StorageTester] Created test file:', file.name, file.type, file.size);
    return file;
  }
}

// Receipt flow testing utilities
export class ReceiptFlowTester {
  private supabase = createBrowserClient();

  async createTestReceipt(userId: string): Promise<any> {
    // Get existing category or use null (categories are pre-populated)
    const { data: categories } = await this.supabase
      .from('categories')
      .select()
      .limit(1);

    const category = categories?.[0] || null;

    // Get existing retailer or use null (retailers can be pre-populated)
    const { data: retailers } = await this.supabase
      .from('retailers')
      .select()
      .limit(1);

    const retailer = retailers?.[0] || null;

    // Create test receipt
    const { data: receipt, error: receiptError } = await this.supabase
      .from('receipts')
      .insert({
        user_id: userId,
        retailer_id: retailer?.id,
        total_amount: 25.50,
        currency: 'BGN',
        purchased_at: new Date().toISOString(),
        processing_status: 'completed'
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
          unit_price: 10.00,
          total_price: 10.00,
          qty: 1
        },
        {
          receipt_id: receipt.id,
          product_name: 'Тестов продукт 2',
          category_id: category?.id,
          unit_price: 15.50,
          total_price: 15.50,
          qty: 1
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
        items(id, product_name, unit_price, total_price, qty, category:categories(name))
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
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // First, get the receipt IDs to delete
    const { data: receiptsToDelete } = await this.supabase
      .from('receipts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate);

    if (!receiptsToDelete || receiptsToDelete.length === 0) {
      return {
        cleaned: true,
        message: 'Няма тестови данни за изчистване'
      };
    }

    const receiptIds = receiptsToDelete.map(r => r.id);

    // Delete items first (child records)
    await this.supabase
      .from('items')
      .delete()
      .in('receipt_id', receiptIds);

    // Then delete receipts (parent records)
    const { error: deleteError } = await this.supabase
      .from('receipts')
      .delete()
      .eq('user_id', userId)
      .gte('created_at', cutoffDate);

    if (deleteError) {
      throw new Error(`Грешка при изчистване на тестови данни: ${deleteError.message}`);
    }

    return {
      cleaned: true,
      message: 'Тестовите данни са изчистени успешно'
    };
  }
}

// Comprehensive cleanup utilities
export class TestDataCleanup {
  private supabase = createBrowserClient();

  /**
   * Remove test receipts created in the last 24 hours for the current user
   */
  async cleanupTestReceipts(userId: string): Promise<any> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get test receipts
    const { data: receipts, error: fetchError } = await this.supabase
      .from('receipts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate);

    if (fetchError) {
      throw new Error(`Грешка при намиране на тестови бележки: ${fetchError.message}`);
    }

    if (!receipts || receipts.length === 0) {
      return {
        deleted: 0,
        message: 'Няма тестови бележки за изчистване'
      };
    }

    // Delete items first (foreign key constraint)
    const receiptIds = receipts.map(r => r.id);
    const { error: itemsError } = await this.supabase
      .from('items')
      .delete()
      .in('receipt_id', receiptIds);

    if (itemsError) {
      console.warn('Грешка при изтриване на артикули:', itemsError.message);
    }

    // Delete receipts
    const { error: receiptsError } = await this.supabase
      .from('receipts')
      .delete()
      .in('id', receiptIds);

    if (receiptsError) {
      throw new Error(`Грешка при изтриване на бележки: ${receiptsError.message}`);
    }

    return {
      deleted: receipts.length,
      message: `Изтрити ${receipts.length} тестови бележки`
    };
  }

  /**
   * Remove test files from storage
   */
  async cleanupTestFiles(userId: string): Promise<any> {
    const { data: files, error: listError } = await this.supabase.storage
      .from('receipts')
      .list(userId);

    if (listError) {
      throw new Error(`Грешка при намиране на тестови файлове: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      return {
        deleted: 0,
        message: 'Няма тестови файлове за изчистване'
      };
    }

    // Filter test files (created in last 24h)
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const testFiles = files.filter(f => {
      const fileDate = new Date(f.created_at);
      return fileDate > cutoffDate && f.name.includes('test');
    });

    if (testFiles.length === 0) {
      return {
        deleted: 0,
        message: 'Няма тестови файлове за изчистване'
      };
    }

    const filePaths = testFiles.map(f => `${userId}/${f.name}`);
    const { error: deleteError } = await this.supabase.storage
      .from('receipts')
      .remove(filePaths);

    if (deleteError) {
      throw new Error(`Грешка при изтриване на файлове: ${deleteError.message}`);
    }

    return {
      deleted: testFiles.length,
      message: `Изтрити ${testFiles.length} тестови файлове`
    };
  }

  /**
   * Cleanup all test data for current user
   */
  async cleanupAll(userId: string): Promise<any> {
    const results = {
      receipts: { deleted: 0, message: '' },
      files: { deleted: 0, message: '' },
      errors: [] as string[]
    };

    // Cleanup receipts
    try {
      results.receipts = await this.cleanupTestReceipts(userId);
    } catch (error: any) {
      results.errors.push(`Бележки: ${error.message}`);
    }

    // Cleanup files
    try {
      results.files = await this.cleanupTestFiles(userId);
    } catch (error: any) {
      results.errors.push(`Файлове: ${error.message}`);
    }

    const totalDeleted = results.receipts.deleted + results.files.deleted;

    return {
      ...results,
      totalDeleted,
      success: results.errors.length === 0,
      message: totalDeleted > 0
        ? `Успешно изчистени ${totalDeleted} тестови записа`
        : 'Няма тестови данни за изчистване'
    };
  }

  /**
   * Delete test user account (requires API endpoint)
   * This cannot be done from client side - needs admin privileges
   */
  async deleteTestUser(email: string): Promise<any> {
    // This needs to be done via an API endpoint with service role key
    console.log('[TestDataCleanup] Calling delete user API for:', email);

    const response = await fetch('/api/test/cleanup-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    console.log('[TestDataCleanup] API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[TestDataCleanup] API error:', error);
      throw new Error(error.error || error.message || 'Грешка при изтриване на потребител');
    }

    const data = await response.json();
    console.log('[TestDataCleanup] API success:', data);

    return {
      deleted: true,
      message: data.message || `Потребител ${email} е изтрит успешно`
    };
  }
}

export default PrizmaTestRunner;
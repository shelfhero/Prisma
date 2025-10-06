'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProcessingStats } from '@/lib/auto-processor';
import { Download, Trash2, User, Globe, Calendar, DollarSign, HelpCircle, Database } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-simple';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    auto_process_receipts: true,
    confidence_threshold: 0.70,
    always_review: false,
  });
  const [stats, setStats] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupMonths, setCleanupMonths] = useState(6);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error getting user:', userError);
        setMessage({ type: 'error', text: 'Грешка при зареждане на потребителя' });
        setLoading(false);
        return;
      }

      if (!user) {
        console.warn('No user found in settings page');
        setLoading(false);
        return;
      }

      // Load user preferences
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefsData) {
        setPreferences({
          auto_process_receipts: prefsData.auto_process_receipts,
          confidence_threshold: prefsData.confidence_threshold,
          always_review: prefsData.always_review,
        });
      }

      // Load processing stats
      const statsData = await getUserProcessingStats(user.id, supabase);
      setStats(statsData);

      // Load user profile info
      setUserProfile(user);

      // Load receipts count
      const { count: receiptsCountData } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setReceiptsCount(receiptsCountData || 0);

      // Load products count
      const { count: productsCountData } = await supabase
        .from('receipt_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setProductsCount(productsCountData || 0);

      // Estimate storage size (simplified)
      const { data: imagesData } = await supabase
        .from('receipts')
        .select('image_url')
        .eq('user_id', user.id);

      // Rough estimate: 1 MB per image average
      setStorageSize((imagesData?.length || 0) * 1);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            ...preferences,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Настройките са запазени успешно!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Грешка при запазване на настройките' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = (format: 'json' | 'csv') => {
    window.open(`/api/user/export?format=${format}`, '_blank');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Грешка при изтриване');
      }

      // Sign out and redirect to home
      await supabase.auth.signOut();
      router.push('/');
    } catch (error: any) {
      console.error('Delete account error:', error);
      setMessage({ type: 'error', text: error.message || 'Грешка при изтриване на профила' });
      setIsDeleting(false);
    }
  };

  const handleCleanOldReceipts = async () => {
    setShowCleanupDialog(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - cleanupMonths);

      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      setMessage({ type: 'success', text: `Стари касови бонове изтрити успешно!` });
      loadSettings(); // Reload to update stats
    } catch (error) {
      console.error('Error cleaning receipts:', error);
      setMessage({ type: 'error', text: 'Грешка при изтриване на касовите бонове' });
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="mt-2 text-gray-600">Управлявайте вашия профил и предпочитания</p>
        </div>

        {/* Profile Section */}
        {userProfile && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-6 h-6 mr-2 text-blue-600" />
              Профил
            </h2>
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {getInitials(userProfile.email)}
                </div>
              </div>
              {/* Profile Info */}
              <div className="flex-1">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg text-gray-900">{userProfile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Регистриран на</label>
                    <p className="text-gray-700 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(userProfile.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Statistics Card */}
        {stats && stats.total_receipts > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">📊</span>
              Статистика на обработването
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.total_receipts}</p>
                <p className="text-sm text-gray-600 mt-1">Общо касови бонове</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.auto_processed_count}</p>
                <p className="text-sm text-gray-600 mt-1">Автоматично</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{stats.auto_categorization_rate}%</p>
                <p className="text-sm text-gray-600 mt-1">Точност</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.total_manual_review_items}</p>
                <p className="text-sm text-gray-600 mt-1">Ръчни корекции</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                <strong>Само {stats.total_manual_review_items} продукта</strong> поискаха вашето внимание от общо{' '}
                <strong>{stats.total_auto_categorized_items + stats.total_manual_review_items}</strong> обработени!
              </p>
            </div>
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Обработване на касови бележки</h2>

          <div className="space-y-6">
            {/* Auto-process toggle */}
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <label className="text-base font-medium text-gray-900 flex items-center">
                  <span className="text-2xl mr-2">✨</span>
                  Автоматично обработване
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Касовите бележки се обработват автоматично и добавят директно към бюджета без ръчен преглед.
                  Преглед се изисква само при ниска сигурност на AI.
                </p>
              </div>
              <button
                onClick={() => setPreferences(prev => ({ ...prev, auto_process_receipts: !prev.auto_process_receipts }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  preferences.auto_process_receipts ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    preferences.auto_process_receipts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Always review toggle (only show if auto-process is on) */}
            {preferences.auto_process_receipts && (
              <div className="flex items-start justify-between pl-10 border-l-2 border-blue-200">
                <div className="flex-1 pr-4">
                  <label className="text-base font-medium text-gray-900">
                    Винаги преглеждай преди добавяне
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    За напреднали потребители: Винаги показвай екран за преглед преди да се добавят продуктите към бюджета.
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, always_review: !prev.always_review }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.always_review ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.always_review ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Confidence threshold slider (only show if auto-process is on and always review is off) */}
            {preferences.auto_process_receipts && !preferences.always_review && (
              <div className="pl-10 border-l-2 border-blue-200">
                <label className="text-base font-medium text-gray-900 block mb-2">
                  Праг на сигурност: {Math.round(preferences.confidence_threshold * 100)}%
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Продукти с по-ниска сигурност от този праг ще изискват ръчен преглед.
                </p>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={preferences.confidence_threshold}
                  onChange={(e) => setPreferences(prev => ({ ...prev, confidence_threshold: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50% - Повече автоматично</span>
                  <span>95% - Повече проверки</span>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Препоръка:</strong> 70% е добър баланс между автоматизация и точност.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Language & Preferences */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Globe className="w-6 h-6 mr-2 text-blue-600" />
            Език и предпочитания
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Език на интерфейса
              </label>
              <select
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue="bg"
              >
                <option value="bg">Български 🇧🇬</option>
                <option value="en" disabled>English 🇬🇧 (Скоро)</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Промяната на езика ще влезе в сила след презареждане на страницата
              </p>
            </div>
          </div>
        </div>

        {/* Usage Statistics & Storage */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Database className="w-6 h-6 mr-2 text-blue-600" />
            Статистика и съхранение
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{receiptsCount}</p>
              <p className="text-sm text-gray-700 mt-1">Касови бонове</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{productsCount}</p>
              <p className="text-sm text-gray-700 mt-1">Продукти</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{storageSize} MB</p>
              <p className="text-sm text-gray-700 mt-1">Използвана памет</p>
            </div>
          </div>

          {/* Cleanup old receipts */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Изчистване на стари данни</h3>
            <p className="text-sm text-gray-600 mb-4">
              Изтрийте касови бонове по-стари от определен период, за да освободите място и подредите историята си.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCleanupDialog(true)}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Изтрий стари касови бонове
              </button>
              <select
                value={cleanupMonths}
                onChange={(e) => setCleanupMonths(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value={3}>по-стари от 3 месеца</option>
                <option value={6}>по-стари от 6 месеца</option>
                <option value={12}>по-стари от 12 месеца</option>
                <option value={24}>по-стари от 2 години</option>
              </select>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Как работи автоматичното обработване?</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="font-bold text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Качване</p>
                <p>Качете снимка на касова бележка</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="font-bold text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">OCR обработка</p>
                <p>Google Vision разпознава текста и извлича продуктите</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="font-bold text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">AI категоризация</p>
                <p>Умен алгоритъм категоризира всеки продукт със сигурност от 0-100%</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Автоматично запазване</p>
                <p>Продукти с висока сигурност се добавят директно в бюджета. Само несигурните продукти изискват вашето внимание.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-blue-600" />
            Помощ и информация
          </h2>
          <div className="space-y-3">
            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600 transition-colors list-none flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Как да променя категорията на продукт?</span>
                <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-2 text-sm text-gray-600 px-3">
                Отидете в "Всички бележки", намерете касовия бон, кликнете "Детайли" и редактирайте категорията на всеки продукт директно.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600 transition-colors list-none flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Моите данни сигурни ли са?</span>
                <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-2 text-sm text-gray-600 px-3">
                Да! Всички данни се съхраняват криптирани в Supabase. Снимките на касови бонове се съхраняват сигурно, и само вие имате достъп до тях.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600 transition-colors list-none flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Как да експортирам данните си?</span>
                <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-2 text-sm text-gray-600 px-3">
                Използвайте бутоните "Експорт JSON" или "Експорт CSV" в секцията "Експорт на данни" по-горе, за да изтеглите всички ваши данни.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600 transition-colors list-none flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Колко точен е AI-ът?</span>
                <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-2 text-sm text-gray-600 px-3">
                Нашият AI има точност над 90% за български касови бонове. Системата автоматично ви уведомява когато има ниска сигурност, за да прегледате ръчно.
              </p>
            </details>
          </div>
        </div>

        {/* Data Export Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Download className="w-6 h-6 mr-2 text-blue-600" />
            Експорт на данни
          </h2>
          <p className="text-gray-600 mb-4">
            Изтеглете всички ваши данни в JSON или CSV формат. Това е вашето право на преносимост на данни според GDPR.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleExportData('json')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Експорт JSON
            </button>
            <button
              onClick={() => handleExportData('csv')}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Експорт CSV
            </button>
          </div>
        </div>

        {/* Account Deletion Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
            <Trash2 className="w-6 h-6 mr-2" />
            Изтриване на профил
          </h2>
          <p className="text-gray-600 mb-4">
            Permanent изтриване на профила и всички данни. <strong>Това действие е необратимо!</strong>
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Внимание:</strong> Това ще изтрие всички ваши касови бележки, бюджети, статистики и профилна информация.
              Препоръчваме да експортирате данните си преди изтриване!
            </p>
          </div>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Изтрий профила ми
          </button>
        </div>

        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Запазване...' : 'Запази настройките'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-red-600 mb-4 flex items-center">
              <Trash2 className="w-6 h-6 mr-2" />
              Сигурни ли сте?
            </h3>

            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Това ще изтрие <strong>PERMANENT</strong> всички ваши данни:
              </p>
              <ul className="list-disc pl-6 mb-4 text-sm text-gray-600 space-y-1">
                <li>Всички касови бележки и снимки</li>
                <li>Всички бюджети и категории</li>
                <li>Профил и настройки</li>
                <li>Статистики и анализи</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Съвет:</strong> Препоръчваме да експортирате данните си преди изтриване!
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Въведете <strong className="text-red-600">DELETE</strong> за потвърждение:
              </label>
              <input
                type="text"
                placeholder='Въведете "DELETE"'
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation('');
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отказ
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Изтриване...' : 'Изтрий профила ми'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Confirmation Dialog */}
      {showCleanupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-orange-600 mb-4 flex items-center">
              <Trash2 className="w-6 h-6 mr-2" />
              Изтриване на стари касови бонове
            </h3>

            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Ще бъдат изтрити всички касови бонове по-стари от <strong>{cleanupMonths} месеца</strong>.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Внимание:</strong> Това действие е необратимо! Препоръчваме да експортирате данните си преди изтриване.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCleanupDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Отказ
              </button>
              <button
                onClick={handleCleanOldReceipts}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Изтрий
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

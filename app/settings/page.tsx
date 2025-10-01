'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { getUserProcessingStats } from '@/lib/auto-processor';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    auto_process_receipts: true,
    confidence_threshold: 0.70,
    always_review: false,
  });
  const [stats, setStats] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
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
          <p className="mt-2 text-gray-600">Конфигурирайте автоматичното обработване на касови бележки</p>
        </div>

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

        {/* How it works */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Как работи?</h2>
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
    </div>
  );
}

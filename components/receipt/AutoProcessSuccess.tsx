'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProcessingResult } from '@/lib/auto-processor';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AutoProcessSuccessProps {
  result: ProcessingResult;
  receiptId: string;
  merchantName: string;
}

interface BudgetImpact {
  remainingBudget: number;
  totalBudget: number;
  percentUsed: number;
}

export default function AutoProcessSuccess({
  result,
  receiptId,
  merchantName,
}: AutoProcessSuccessProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [budgetImpact, setBudgetImpact] = useState<BudgetImpact | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoDismissTimer, setAutoDismissTimer] = useState(5);

  useEffect(() => {
    // Trigger confetti animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Load budget impact
    loadBudgetImpact();

    // Auto-dismiss countdown
    const countdown = setInterval(() => {
      setAutoDismissTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const loadBudgetImpact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month's budget
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: budgetData } = await supabase
        .from('budget_categories')
        .select('budget, spent')
        .eq('user_id', user.id)
        .gte('month', monthStart)
        .lte('month', monthEnd);

      if (budgetData && budgetData.length > 0) {
        const totalBudget = budgetData.reduce((sum, cat) => sum + (cat.budget || 0), 0);
        const totalSpent = budgetData.reduce((sum, cat) => sum + (cat.spent || 0), 0);
        const remaining = totalBudget - totalSpent;
        const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        setBudgetImpact({
          remainingBudget: remaining,
          totalBudget,
          percentUsed,
        });
      }
    } catch (error) {
      console.error('Error loading budget impact:', error);
    }
  };

  const handleDone = () => {
    router.push('/dashboard');
  };

  const handleUploadAnother = () => {
    router.push('/upload-receipt');
  };

  const handleCorrect = () => {
    router.push(`/verify-receipt/${receiptId}`);
  };

  // Fully auto-processed
  if (result.autoProcessed && !result.requiresReview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="max-w-lg w-full relative z-10">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-green-200">
            {/* Success Header with Checkmark */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-scale-in">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">✓ Готово!</h1>
              <p className="text-2xl font-semibold text-gray-700 mb-1">
                {merchantName}
              </p>
              <p className="text-3xl font-bold text-green-600">
                {result.totalAmount.toFixed(2)} лв
              </p>
            </div>

            {/* Category Breakdown - Compact */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                Автоматично добавено към бюджет:
              </h2>
              <div className="space-y-2">
                {result.categoryBreakdown.slice(0, 3).map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getCategoryEmoji(cat.category)}</span>
                      <span className="font-medium text-gray-900 text-sm">{cat.category}</span>
                    </div>
                    <span className="font-bold text-gray-900">{cat.total.toFixed(2)} лв</span>
                  </div>
                ))}
                {result.categoryBreakdown.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{result.categoryBreakdown.length - 3} още категори
                  </p>
                )}
              </div>
            </div>

            {/* Budget Impact */}
            {budgetImpact && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-900 font-bold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Бюджет актуализиран ✓
                  </p>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-blue-700">Остават този месец:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    {budgetImpact.remainingBudget.toFixed(0)} лв
                  </span>
                </div>
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      budgetImpact.percentUsed > 90 ? 'bg-red-500' :
                      budgetImpact.percentUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budgetImpact.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {budgetImpact.percentUsed.toFixed(0)}% от {budgetImpact.totalBudget.toFixed(0)} лв използвани
                </p>
              </div>
            )}

            {/* Auto-dismiss notice */}
            <div className="mb-4 text-center">
              <p className="text-xs text-gray-500">
                Автоматично пренасочване след {autoDismissTimer}с...
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleDone}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Разбрах
              </button>
              <button
                onClick={handleUploadAnother}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Качи още бон
              </button>
            </div>

            {/* Correction Link - Tiny and subtle */}
            <div className="text-center mt-3">
              <button
                onClick={handleCorrect}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Грешка в категориите? Коригирай →
              </button>
            </div>
          </div>
        </div>

        {/* Inline CSS for confetti animation */}
        <style jsx>{`
          @keyframes confetti {
            0% {
              transform: translateY(0) rotateZ(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotateZ(720deg);
              opacity: 0;
            }
          }
          @keyframes scale-in {
            0% {
              transform: scale(0);
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
            }
          }
          .animate-confetti {
            animation: confetti linear forwards;
          }
          .animate-scale-in {
            animation: scale-in 0.5s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Partially processed (some items need review)
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Warning Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Почти готово!</h1>
            <p className="text-xl text-gray-700">
              {merchantName} - {result.totalAmount.toFixed(2)} лв
            </p>
          </div>

          {/* Auto-saved Summary */}
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {result.autoSavedItems.length} продукта добавени автоматично
            </p>
          </div>

          {/* Needs Review */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-semibold flex items-center mb-2">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {result.uncertainItems.length} продукт{result.uncertainItems.length !== 1 ? 'а' : ''} изискв{result.uncertainItems.length !== 1 ? 'ат' : 'а'} внимание
            </p>
            <p className="text-sm text-yellow-700">
              Не успяхме да категоризираме някои продукти с достатъчна сигурност.
            </p>
          </div>

          {/* Category Breakdown (if any auto-saved) */}
          {result.categoryBreakdown.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Добавено към бюджет:</h3>
              <div className="space-y-1">
                {result.categoryBreakdown.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {getCategoryEmoji(cat.category)} {cat.category}
                    </span>
                    <span className="font-medium text-gray-900">{cat.total.toFixed(2)} лв</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/receipt/quick-review/${receiptId}`)}
              className="w-full py-3 px-6 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
            >
              Прегледай {result.uncertainItems.length} продукт{result.uncertainItems.length !== 1 ? 'а' : ''}
            </button>
            <button
              onClick={handleDone}
              className="w-full py-3 px-6 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Прегледай по-късно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get emoji for category
function getCategoryEmoji(category: string): string {
  const emojiMap: { [key: string]: string } = {
    'Храна и напитки': '🍎',
    'Месо и риба': '🥩',
    'Мляко и млечни продукти': '🥛',
    'Плодове и зеленчуци': '🥗',
    'Хляб и тестени изделия': '🍞',
    'Алкохол': '🍺',
    'Напитки': '🥤',
    'Закуски': '🍭',
    'Бита техника': '🔌',
    'Дрехи и обувки': '👕',
    'Здраве и лекарства': '💊',
    'Козметика и лична хигиена': '🧴',
    'Транспорт': '🚗',
    'Развлечения': '🎮',
    'Други': '📦',
  };

  return emojiMap[category] || '📦';
}

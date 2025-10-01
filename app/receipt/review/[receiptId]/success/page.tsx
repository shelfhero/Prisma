'use client';

/**
 * Receipt Review Success Page for Призма
 * Shown after successful categorization and save
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  CheckCircle,
  TrendingUp,
  Upload,
  Eye,
  Award,
  Sparkles
} from 'lucide-react';

export default function ReceiptReviewSuccessPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const receiptId = params.receiptId as string;

  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        {confetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                {['🎉', '✨', '🎊', '⭐', '💫'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Успех! 🎉
            </h1>
            <p className="text-lg text-gray-600">
              Касовият бон е обработен и добавен към бюджета
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                <Award className="w-8 h-8 mx-auto mb-2" />
              </div>
              <div className="text-sm text-gray-600">+10 точки</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                <Sparkles className="w-8 h-8 mx-auto mb-2" />
              </div>
              <div className="text-sm text-gray-600">Всички категоризирани</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                <TrendingUp className="w-8 h-8 mx-auto mb-2" />
              </div>
              <div className="text-sm text-gray-600">Бюджет обновен</div>
            </div>
          </div>

          {/* Next Actions */}
          <div className="space-y-3">
            <Link href="/upload-receipt" className="block">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                <Upload className="w-5 h-5 mr-2" />
                Качи още един бон
              </Button>
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/budget">
                <Button variant="outline" className="w-full border-blue-300 text-blue-700">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Виж бюджет
                </Button>
              </Link>
              <Link href={`/verify-receipt/${receiptId}`}>
                <Button variant="outline" className="w-full border-gray-300">
                  <Eye className="w-4 h-4 mr-2" />
                  Прегледай бона
                </Button>
              </Link>
            </div>

            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="w-full text-gray-600"
            >
              Към начална страница
            </Button>
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Знаете ли, че...</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Можете да качите до 10 бона наведнъж</li>
              <li>• AI категоризацията става по-точна с всеки бон</li>
              <li>• Спестявате 5-10 минути на всеки обработен бон</li>
            </ul>
          </div>
        </Card>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </ProtectedRoute>
  );
}

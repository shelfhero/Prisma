'use client';

/**
 * Welcome Step - First step in onboarding
 * Shows friendly welcome message and app benefits
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, PiggyBank, BarChart3, Zap, Heart, Star } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  userName?: string;
}

export default function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full p-8 lg:p-12">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Добре дошли в Призма! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            {userName ? `Здравей, ${userName}!` : 'Здравейте!'}
          </p>
          <p className="text-lg text-gray-600">
            Вашият умен асистент за управление на разходи и касови бележки
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Сканирай бонове</h3>
            <p className="text-sm text-gray-600">
              Просто снимай касовия бон и ние автоматично обработваме всичко
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Умно бюджетиране</h3>
            <p className="text-sm text-gray-600">
              Задавай лимити по категории и следи разходите в реално време
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Анализи и отчети</h3>
            <p className="text-sm text-gray-600">
              Виж накъде отиват парите ти с детайлни визуализации
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3 mb-3">
            <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Бързо и лесно</h4>
              <p className="text-sm text-gray-600">
                Добави бон само за секунди - автоматично разпознаване с AI
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 mb-3">
            <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Специално за България</h4>
              <p className="text-sm text-gray-600">
                Поддръжка на български магазини, BGN валута и кирилица
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <PiggyBank className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Спести повече</h4>
              <p className="text-sm text-gray-600">
                Виж точно къде харчиш и оптимизирай разходите си
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={onNext}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-6 text-lg"
          >
            Започнете сега 🚀
          </Button>
          <p className="text-xs text-gray-500 mt-4">
            Ще отнеме само 1-2 минути
          </p>
        </div>
      </Card>
    </div>
  );
}

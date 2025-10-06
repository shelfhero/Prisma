'use client';

/**
 * First Receipt Step - Third and final step in onboarding
 * Encourage user to upload their first receipt or skip
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, ArrowRight, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FirstReceiptStepProps {
  onComplete: () => void;
  userName?: string;
}

export default function FirstReceiptStep({ onComplete, userName }: FirstReceiptStepProps) {
  const router = useRouter();

  const handleUploadReceipt = () => {
    // Complete onboarding first, then redirect to upload
    onComplete();
    router.push('/upload-receipt');
  };

  const handleSkip = () => {
    // Complete onboarding and go to dashboard
    onComplete();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 lg:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Стъпка 2 от 2: Първият Ви касов бон
          </h2>
          <p className="text-lg text-gray-600">
            {userName ? `${userName}, готови` : 'Готови'} ли сте да започнете проследяването на разходите си?
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg border-2 border-green-200 p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            Какво ще се случи след като качите бон:
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <span className="text-green-600 font-bold flex-shrink-0">1.</span>
              <span className="text-gray-700">
                <strong>Автоматично сканиране</strong> - AI ще прочете всички продукти и цени
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-green-600 font-bold flex-shrink-0">2.</span>
              <span className="text-gray-700">
                <strong>Категоризация</strong> - Продуктите ще бъдат автоматично разпределени по категории
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-green-600 font-bold flex-shrink-0">3.</span>
              <span className="text-gray-700">
                <strong>Преглед</strong> - Ще можете да прегледате и коригирате данните при нужда
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-green-600 font-bold flex-shrink-0">4.</span>
              <span className="text-gray-700">
                <strong>Готово!</strong> - Бонът е запазен и можете да следите разходите си
              </span>
            </li>
          </ul>
        </div>

        {/* Visual Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Camera className="w-10 h-10 text-blue-600 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 mb-1">Снимай</h4>
            <p className="text-sm text-gray-600">Направи снимка на бона с телефона си</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Upload className="w-10 h-10 text-purple-600 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 mb-1">Качи</h4>
            <p className="text-sm text-gray-600">Избери файл от галерията си</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="py-4 mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-gray-500">Профил → Първи бон ✓</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={handleUploadReceipt}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Качете първия си касов бон
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleSkip}
            className="border-2"
          >
            Пропусни засега
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Можете да качите бон по всяко време от главното меню
          </p>
        </div>
      </Card>
    </div>
  );
}

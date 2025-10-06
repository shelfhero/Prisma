'use client';

/**
 * Profile Setup Step - Second step in onboarding
 * Collect user's name and preferences
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Loader2 } from 'lucide-react';

interface ProfileSetupStepProps {
  onNext: (data: { full_name: string }) => void;
  onSkip?: () => void;
  initialName?: string;
  loading?: boolean;
}

export default function ProfileSetupStep({
  onNext,
  onSkip,
  initialName = '',
  loading = false
}: ProfileSetupStepProps) {
  const [fullName, setFullName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim()) {
      onNext({ full_name: fullName.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 lg:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Стъпка 1 от 2: Вашият профил
          </h2>
          <p className="text-gray-600">
            Нека да се запознаем! Как искате да Ви наричаме?
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="fullName" className="text-base font-semibold text-gray-900 mb-2 block">
              Вашето име *
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="напр. Иван Петров"
              className="text-lg p-6 border-2 border-gray-300 focus:border-blue-500"
              required
              autoFocus
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-2">
              Ще използваме това име, за да персонализираме изживяването Ви
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="py-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="w-16 h-1 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            </div>
            <p className="text-center text-xs text-gray-500">Профил → Първи бон</p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              size="lg"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              disabled={!fullName.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Запазване...
                </>
              ) : (
                'Продължи напред →'
              )}
            </Button>
            {onSkip && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={onSkip}
                disabled={loading}
                className="sm:w-auto"
              >
                Пропусни засега
              </Button>
            )}
          </div>
        </form>

        {/* Helper Text */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Защо питаме?</strong> Персонализираното име прави изживяването
            по-приятно и помага за по-добра комуникация в приложението.
          </p>
        </div>
      </Card>
    </div>
  );
}

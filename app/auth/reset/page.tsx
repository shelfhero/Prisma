'use client';

/**
 * Reset Password Page for Призма
 * Password recovery with email verification
 */

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/auth';
import { validateResetPasswordForm, getFieldError, ValidationError } from '@/lib/validation';
import { getAuthErrorMessage } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResetFormData {
  email: string;
}

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState<ResetFormData>({
    email: ''
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));

    // Clear field error when user starts typing
    if (errors.some(error => error.field === 'email')) {
      setErrors(prev => prev.filter(error => error.field !== 'email'));
    }

    // Clear auth error
    if (authError) {
      setAuthError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateResetPasswordForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      await resetPassword(formData.email);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = getAuthErrorMessage(error);
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto h-16 w-16 flex items-center justify-center bg-blue-100 rounded-full">
          <svg
            className="h-8 w-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Имейлът е изпратен!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Проверете пощата си за инструкции как да възстановите паролата
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h4 className="font-medium text-blue-900 mb-2">
            Следващи стъпки:
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Проверете входящата си поща (и папката за спам)</li>
            <li>• Кликнете върху връзката в имейла</li>
            <li>• Въведете новата си парола</li>
            <li>• Влезте в профила си с новата парола</li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            onClick={() => setIsSuccess(false)}
            variant="outline"
            className="w-full"
          >
            Изпратете отново
          </Button>

          <Link href="/auth/login">
            <Button variant="ghost" className="w-full">
              Обратно към влизане
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Възстановяване на парола
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Въведете имейл адреса си и ще ви изпратим инструкции за възстановяване
        </p>
      </div>

      {/* Auth Error */}
      {authError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{authError}</p>
          </div>
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Имейл адрес"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          error={getFieldError(errors, 'email')}
          placeholder="ivan@example.com"
          required
          helperText="Въведете имейла, с който сте се регистрирали"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
              />
            </svg>
          }
        />

        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Изпращане...' : 'Изпратете инструкции'}
        </Button>
      </form>

      {/* Back to Login */}
      <div className="text-center">
        <Link
          href="/auth/login"
          className="text-sm text-blue-600 hover:text-blue-500 transition-colors flex items-center justify-center"
        >
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Обратно към влизане
        </Link>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-1">Безопасност</h4>
            <p>
              Връзката за възстановяване е валидна 1 час. Ако не получите имейл в рамките на
              няколко минути, проверете папката за спам или се опитайте отново.
            </p>
          </div>
        </div>
      </div>

      {/* Alternative Actions */}
      <div className="border-t border-gray-200 pt-6">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Имате проблеми с възстановяването?
          </p>

          <div className="flex flex-col space-y-2">
            <Link href="/auth/register">
              <Button variant="outline" className="w-full" size="sm">
                Създайте нов профил
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="w-full"
              size="sm"
              onClick={() => {
                // TODO: Implement contact support
                alert('Свържете се с поддръжката на support@prizma.bg');
              }}
            >
              Свържете се с поддръжката
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
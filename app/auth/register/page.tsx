'use client';

/**
 * Register Page for Призма
 * User registration with email, password, and profile information
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, createUserProfile } from '@/lib/auth';
import { validateRegisterForm, getFieldError, ValidationError } from '@/lib/validation';
import { getAuthErrorMessage } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'acceptTerms' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors.some(error => error.field === field)) {
      setErrors(prev => prev.filter(error => error.field !== field));
    }

    // Clear auth error
    if (authError) {
      setAuthError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateRegisterForm(formData);

    // Check if terms are accepted
    if (!formData.acceptTerms) {
      validationErrors.push({
        field: 'acceptTerms',
        message: 'Трябва да приемете условията за ползване'
      });
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      // Sign up user
      const data = await signUp(formData.email, formData.password, {
        full_name: formData.fullName
      });

      if (data?.user) {
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          // Create user profile
          await createUserProfile(data.user);
        } catch (profileError: any) {
          console.warn('Profile creation failed, but user was created:', profileError.message);
          // Don't fail the whole registration if profile creation fails
          // The profile can be created later or via database trigger
        }

        setIsSuccess(true);

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
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
        <div className="mx-auto h-16 w-16 flex items-center justify-center bg-green-100 rounded-full">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Добре дошли в Призма!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Профилът ви е създаден успешно. Пренасочване към главната страница...
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            Проверете имейла си за потвърждение на профила.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Регистрация в Призма
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Създайте профил за да започнете да управлявате касовите си бележки
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

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Пълно име"
          type="text"
          value={formData.fullName}
          onChange={handleInputChange('fullName')}
          error={getFieldError(errors, 'fullName')}
          placeholder="Иван Петров"
          required
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        />

        <Input
          label="Имейл адрес"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={getFieldError(errors, 'email')}
          placeholder="ivan@example.com"
          required
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

        <Input
          label="Парола"
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={getFieldError(errors, 'password')}
          placeholder="Поне 6 символа"
          required
          helperText="Паролата трябва да съдържа поне 6 символа, главна и малка буква, и цифра"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          }
        />

        <Input
          label="Потвърдете паролата"
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          error={getFieldError(errors, 'confirmPassword')}
          placeholder="Въведете паролата отново"
          required
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* Terms and Conditions */}
        <div className="space-y-2">
          <div className="flex items-start">
            <input
              id="accept-terms"
              name="accept-terms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={handleInputChange('acceptTerms')}
              className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="accept-terms" className="ml-3 block text-sm text-gray-700">
              Приемам{' '}
              <Link
                href="/terms"
                className="text-blue-600 hover:text-blue-500 underline"
                target="_blank"
              >
                условията за ползване
              </Link>
              {' '}и{' '}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-500 underline"
                target="_blank"
              >
                политиката за поверителност
              </Link>
            </label>
          </div>
          {getFieldError(errors, 'acceptTerms') && (
            <p className="text-sm text-red-600 flex items-center ml-7">
              <svg
                className="h-4 w-4 mr-1 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {getFieldError(errors, 'acceptTerms')}
            </p>
          )}
        </div>

        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Създаване на профил...' : 'Създайте профил'}
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Вече имате профил?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Влезте тук
          </Link>
        </p>
      </div>

      {/* Features Preview */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 text-center">
          Какво можете да правите с Призма?
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center text-sm text-gray-700">
            <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Сканирайте и съхранявайте касови бележки автоматично
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Категorizирайте разходите си автоматично
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Анализирайте разходите си с подробни отчети
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Експортирайте данните си за данъчни цели
          </div>
        </div>
      </div>
    </div>
  );
}
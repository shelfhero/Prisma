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
  acceptPrivacy: boolean;
  acceptDataProcessing: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
    acceptDataProcessing: false
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = ['acceptTerms', 'acceptPrivacy', 'acceptDataProcessing'].includes(field)
      ? e.target.checked
      : e.target.value;
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

    // Check if all consents are accepted (GDPR requirement)
    if (!formData.acceptTerms) {
      validationErrors.push({
        field: 'acceptTerms',
        message: 'Трябва да приемете условията за ползване'
      });
    }

    if (!formData.acceptPrivacy) {
      validationErrors.push({
        field: 'acceptPrivacy',
        message: 'Трябва да приемете политиката за поверителност'
      });
    }

    if (!formData.acceptDataProcessing) {
      validationErrors.push({
        field: 'acceptDataProcessing',
        message: 'Трябва да се съгласите с обработката на данните с AI технологии'
      });
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      console.log('Starting registration for:', formData.email);

      // Sign up user
      const data = await signUp(formData.email, formData.password, {
        full_name: formData.fullName
      });

      console.log('Signup result:', data);

      if (data?.user) {
        console.log('User created successfully:', data.user.id);

        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          // Create user profile
          console.log('Creating user profile...');
          await createUserProfile(data.user);
          console.log('Profile created successfully');
        } catch (profileError: any) {
          console.warn('Profile creation failed, but user was created:', profileError.message);
          // Don't fail the whole registration if profile creation fails
          // The profile can be created later or via database trigger
        }

        // Check if email confirmation is required
        if (data.session) {
          console.log('User has active session, redirecting to onboarding');
          setIsSuccess(true);
          setTimeout(() => {
            router.push('/onboarding');
          }, 2000);
        } else {
          console.log('Email confirmation required');
          setIsSuccess(true);
          // Show success message but don't redirect yet
        }
      } else {
        throw new Error('User creation failed - no user returned');
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
            <div className="flex-1">
              <p className="text-sm text-red-700">{authError}</p>
              {authError.includes('вече съществува') && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-red-600">
                    Ако имате профил, опитайте:
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      Влизане в профил
                    </Link>
                    <Link
                      href="/auth/forgot-password"
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                    >
                      Забравена парола
                    </Link>
                  </div>
                </div>
              )}
            </div>
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

        {/* GDPR Consent Checkboxes */}
        <div className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">
            За да продължите, моля потвърдете:
          </p>

          {/* Terms of Service */}
          <div className="space-y-1">
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
                  className="text-blue-600 hover:text-blue-500 underline font-medium"
                  target="_blank"
                >
                  Условията за ползване
                </Link>
              </label>
            </div>
            {getFieldError(errors, 'acceptTerms') && (
              <p className="text-sm text-red-600 flex items-center ml-7">
                <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {getFieldError(errors, 'acceptTerms')}
              </p>
            )}
          </div>

          {/* Privacy Policy */}
          <div className="space-y-1">
            <div className="flex items-start">
              <input
                id="accept-privacy"
                name="accept-privacy"
                type="checkbox"
                checked={formData.acceptPrivacy}
                onChange={handleInputChange('acceptPrivacy')}
                className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="accept-privacy" className="ml-3 block text-sm text-gray-700">
                Приемам{' '}
                <Link
                  href="/privacy"
                  className="text-blue-600 hover:text-blue-500 underline font-medium"
                  target="_blank"
                >
                  Политиката за поверителност
                </Link>
              </label>
            </div>
            {getFieldError(errors, 'acceptPrivacy') && (
              <p className="text-sm text-red-600 flex items-center ml-7">
                <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {getFieldError(errors, 'acceptPrivacy')}
              </p>
            )}
          </div>

          {/* AI Data Processing Consent */}
          <div className="space-y-1">
            <div className="flex items-start">
              <input
                id="accept-ai"
                name="accept-ai"
                type="checkbox"
                checked={formData.acceptDataProcessing}
                onChange={handleInputChange('acceptDataProcessing')}
                className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="accept-ai" className="ml-3 block text-sm text-gray-700">
                Съгласен съм личните ми данни да бъдат обработвани с AI технологии
                (Google Vision, OpenAI) за целите на услугата
              </label>
            </div>
            {getFieldError(errors, 'acceptDataProcessing') && (
              <p className="text-sm text-red-600 flex items-center ml-7">
                <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {getFieldError(errors, 'acceptDataProcessing')}
              </p>
            )}
          </div>
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
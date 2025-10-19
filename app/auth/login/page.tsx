'use client';

/**
 * Login Page for Призма
 * User authentication with email and password
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/auth';
import { validateLoginForm, getFieldError, ValidationError } from '@/lib/validation';
import { getAuthErrorMessage } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginFormData {
  email: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  // Get redirect URL from search params
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const reason = searchParams.get('reason');

  // Show appropriate message based on redirect reason
  const getRedirectMessage = () => {
    switch (reason) {
      case 'auth_required':
        return 'Моля, влезте в профила си за да продължите';
      case 'session_expired':
        return 'Сесията ви е изтекла. Моля, влезте отново';
      case 'invalid_session':
        return 'Невалидна сесия. Моля, влезте отново';
      default:
        return null;
    }
  };

  const redirectMessage = getRedirectMessage();

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
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
    const validationErrors = validateLoginForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      console.log('Attempting login for:', formData.email);

      const data = await signIn(formData.email, formData.password);

      console.log('Login successful:', data.user?.email);

      // Small delay to allow auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to dashboard or intended page
      console.log('Redirecting to:', redirectTo);
      router.push(redirectTo);
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = getAuthErrorMessage(error);
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Вход в Призма
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Влезте в профила си за да управлявате касовите си бележки
        </p>
      </div>

      {/* Redirect Message */}
      {redirectMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-blue-700">{redirectMessage}</p>
          </div>
        </div>
      )}

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

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="Въведете паролата си"
          required
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

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Запомни ме
            </label>
          </div>

          <Link
            href="/auth/reset"
            className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
          >
            Забравили сте паролата?
          </Link>
        </div>

        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Влизане...' : 'Влезте в профила'}
        </Button>
      </form>

      {/* Register Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Нямате профил?{' '}
          <Link
            href="/auth/register"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Регистрирайте се тук
          </Link>
        </p>
      </div>

      {/* Social Login (Future) */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            или продължете с
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="w-full"
          disabled
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>

        <Button
          variant="outline"
          className="w-full"
          disabled
        >
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500">
        Скоро ще бъдат налични
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
'use client';

/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly message
 */

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Нещо се обърка
              </h1>

              {/* Message */}
              <p className="text-gray-600 mb-8">
                Възникна неочаквана грешка. Извиняваме се за неудобството.
                Моля, опитайте да презаредите страницата или се върнете към началото.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-8 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                    Техническа информация (само за разработка)
                  </summary>
                  <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-800">
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Презареди страницата
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  size="lg"
                  variant="outline"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Към началото
                </Button>
              </div>

              {/* Support Info */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  Ако проблемът продължава, свържете се с нас:
                </p>
                <div className="flex flex-wrap gap-4 justify-center text-sm">
                  <a
                    href="mailto:support@prizma.bg"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    support@prizma.bg
                  </a>
                  <a
                    href="tel:+359888123456"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    +359 888 123 456
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

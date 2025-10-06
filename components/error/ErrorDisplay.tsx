'use client';

/**
 * Error Display Component
 * User-friendly error display with retry and support options
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Mail, Phone, X } from 'lucide-react';
import { AppError, getSupportContact } from '@/lib/error-handler';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export default function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDismiss = true
}: ErrorDisplayProps) {
  const support = getSupportContact();

  // Icon color based on error type
  const getIconColor = () => {
    switch (error.type) {
      case 'validation':
        return 'text-yellow-500';
      case 'budget':
        return 'text-orange-500';
      case 'network':
        return 'text-blue-500';
      default:
        return 'text-red-500';
    }
  };

  // Background color based on error type
  const getBgColor = () => {
    switch (error.type) {
      case 'validation':
        return 'bg-yellow-50 border-yellow-200';
      case 'budget':
        return 'bg-orange-50 border-orange-200';
      case 'network':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <Card className={`${getBgColor()} border-2 p-6`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="ml-4 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {error.title}
              </h3>
              <p className="text-gray-700 mb-4">
                {error.message}
              </p>
            </div>

            {showDismiss && onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Затвори"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {error.canRetry && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Опитай отново
              </Button>
            )}

            {error.action && (
              <Button
                onClick={error.action.handler}
                size="sm"
                variant="outline"
              >
                {error.action.label}
              </Button>
            )}

            {error.showSupport && (
              <div className="w-full mt-4 pt-4 border-t border-gray-300">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Нуждаете се от помощ?
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a
                    href={`mailto:${support.email}`}
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    {support.email}
                  </a>
                  <a
                    href={`tel:${support.phone}`}
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    {support.phone}
                  </a>
                  <span className="text-gray-600">
                    ({support.hours})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Technical Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error.technicalMessage && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                Техническа информация (само за разработка)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-800 overflow-x-auto">
                {error.technicalMessage}
              </pre>
            </details>
          )}
        </div>
      </div>
    </Card>
  );
}

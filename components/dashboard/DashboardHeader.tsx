/**
 * Dashboard Header Component for Призма
 * Shows user info and navigation
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardHeader() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              Призма
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {process.env.NODE_ENV === 'development' && (
              <Link href="/test-supabase">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  🧪 Тестове
                </Button>
              </Link>
            )}
            <div className="text-sm text-gray-700">
              Здравейте, {profile?.full_name || user?.email}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
            >
              Изход
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
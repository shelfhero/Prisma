'use client';

/**
 * Onboarding Page for Призма
 * Guides new users through initial setup
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    // Redirect if already completed onboarding
    if (profile?.onboarding_completed) {
      router.push('/dashboard');
    }
  }, [user, profile, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Get initial step from profile if available
  const initialStep = profile?.onboarding_step as any || 'welcome';

  return <OnboardingFlow initialStep={initialStep} />;
}

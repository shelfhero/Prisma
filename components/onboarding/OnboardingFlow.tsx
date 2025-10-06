'use client';

/**
 * Onboarding Flow - Main component that manages the onboarding steps
 * Tracks progress and updates user profile
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase-simple';
import WelcomeStep from './WelcomeStep';
import ProfileSetupStep from './ProfileSetupStep';
import FirstReceiptStep from './FirstReceiptStep';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'welcome' | 'profile' | 'first_receipt' | 'completed';

interface OnboardingFlowProps {
  initialStep?: OnboardingStep;
}

export default function OnboardingFlow({ initialStep = 'welcome' }: OnboardingFlowProps) {
  const { user, profile, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserClient();

  // Check if user has already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  const updateOnboardingProgress = async (step: OnboardingStep, additionalData?: any) => {
    if (!user?.id) return;

    try {
      const updates: any = {
        onboarding_step: step,
        updated_at: new Date().toISOString(),
      };

      // Add any additional data
      if (additionalData) {
        Object.assign(updates, additionalData);
      }

      // Mark as completed if on final step
      if (step === 'completed') {
        updates.onboarding_completed = true;
        updates.onboarding_completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating onboarding progress:', error);
        throw error;
      }

      // Refresh user data
      await refreshUser();
    } catch (error) {
      console.error('Failed to update onboarding:', error);
      toast.error('Грешка при запазване на прогреса');
    }
  };

  const handleWelcomeNext = async () => {
    setCurrentStep('profile');
    await updateOnboardingProgress('profile');
  };

  const handleProfileNext = async (data: { full_name: string }) => {
    setLoading(true);
    try {
      // Update profile with name
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      // Also update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name }
      });

      if (metadataError) console.warn('Failed to update user metadata:', metadataError);

      toast.success(`Приятно е да се запознаем, ${data.full_name}!`);
      setCurrentStep('first_receipt');
      await updateOnboardingProgress('first_receipt');
      await refreshUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Грешка при запазване на профила');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSkip = async () => {
    setCurrentStep('first_receipt');
    await updateOnboardingProgress('first_receipt');
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateOnboardingProgress('completed');
      toast.success('Добре дошли в Призма! 🎉');

      // Small delay for better UX
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Грешка при завършване');
      // Still redirect to dashboard
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Get user's name from profile or user metadata
  const userName = profile?.full_name || user?.user_metadata?.full_name;

  // Render current step
  switch (currentStep) {
    case 'welcome':
      return <WelcomeStep onNext={handleWelcomeNext} userName={userName} />;

    case 'profile':
      return (
        <ProfileSetupStep
          onNext={handleProfileNext}
          onSkip={handleProfileSkip}
          initialName={userName || ''}
          loading={loading}
        />
      );

    case 'first_receipt':
      return <FirstReceiptStep onComplete={handleComplete} userName={userName} />;

    default:
      return null;
  }
}

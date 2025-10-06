'use client';

/**
 * Offline Detection Hook
 * Detects network status and provides offline handling utilities
 */

import { useState, useEffect } from 'react';

export interface OfflineState {
  isOffline: boolean;
  isOnline: boolean;
  wasOffline: boolean; // Track if user was offline and came back online
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOffline: false,
    isOnline: true,
    wasOffline: false,
  });

  useEffect(() => {
    // Check if we're in browser
    if (typeof window === 'undefined') return;

    // Set initial state
    const initialOnline = navigator.onLine;
    setState({
      isOffline: !initialOnline,
      isOnline: initialOnline,
      wasOffline: false,
    });

    // Handle going offline
    const handleOffline = () => {
      console.log('🔴 Network: OFFLINE');
      setState(prev => ({
        isOffline: true,
        isOnline: false,
        wasOffline: prev.wasOffline,
      }));
    };

    // Handle coming back online
    const handleOnline = () => {
      console.log('🟢 Network: ONLINE');
      setState(prev => ({
        isOffline: false,
        isOnline: true,
        wasOffline: prev.isOffline, // Mark that we were offline
      }));

      // Clear the wasOffline flag after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, wasOffline: false }));
      }, 5000);
    };

    // Add event listeners
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Cleanup
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return state;
}

/**
 * Check if a fetch request failed due to network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError ||
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('Failed to fetch') ||
    !navigator.onLine
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if not a network error
      if (!isNetworkError(error)) {
        throw error;
      }

      // Don't wait on last retry
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

'use client';

/**
 * Offline Indicator Component
 * Shows status banner when user is offline
 */

import { useOffline } from '@/hooks/useOffline';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const { isOffline, wasOffline } = useOffline();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show reconnected message when coming back online
  useEffect(() => {
    if (wasOffline && !isOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOffline]);

  // Don't show anything if online and not recently reconnected
  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center space-x-2">
              <WifiOff className="w-5 h-5 animate-pulse" />
              <p className="font-semibold">
                Няма връзка с интернет
              </p>
              <span className="hidden sm:inline text-sm opacity-90">
                • Промените ще бъдат запазени, когато се свържете отново
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reconnected Banner */}
      {showReconnected && !isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white animate-slide-down">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center space-x-2">
              <Wifi className="w-5 h-5" />
              <p className="font-semibold">
                Връзката е възстановена
              </p>
              <span className="hidden sm:inline text-sm opacity-90">
                • Синхронизиране на данните...
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

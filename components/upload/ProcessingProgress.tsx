/**
 * Processing Progress Component
 * Shows real-time progress stages to make processing feel faster
 * Inspired by Fetch Rewards UX
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Upload, FileSearch, Tags, Database, CheckCircle2 } from 'lucide-react';

export type ProcessingStage =
  | 'optimizing'
  | 'uploading'
  | 'ocr'
  | 'categorizing'
  | 'saving'
  | 'complete';

interface ProcessingProgressProps {
  currentStage: ProcessingStage;
  onComplete?: () => void;
}

interface Stage {
  id: ProcessingStage;
  label: string;
  icon: React.ReactNode;
  estimatedTime: number; // milliseconds
}

const PROCESSING_STAGES: Stage[] = [
  {
    id: 'optimizing',
    label: 'Оптимизиране на снимката...',
    icon: <FileSearch className="w-6 h-6" />,
    estimatedTime: 500,
  },
  {
    id: 'uploading',
    label: 'Качване на касовата бележка...',
    icon: <Upload className="w-6 h-6" />,
    estimatedTime: 2000,
  },
  {
    id: 'ocr',
    label: 'Разпознаване на текст и продукти...',
    icon: <FileSearch className="w-6 h-6" />,
    estimatedTime: 4000,
  },
  {
    id: 'categorizing',
    label: 'Категоризиране на продукти...',
    icon: <Tags className="w-6 h-6" />,
    estimatedTime: 2000,
  },
  {
    id: 'saving',
    label: 'Запазване на данните...',
    icon: <Database className="w-6 h-6" />,
    estimatedTime: 500,
  },
  {
    id: 'complete',
    label: 'Готово!',
    icon: <CheckCircle2 className="w-6 h-6" />,
    estimatedTime: 0,
  },
];

export default function ProcessingProgress({ currentStage, onComplete }: ProcessingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentStageIndex = PROCESSING_STAGES.findIndex(s => s.id === currentStage);
  const currentStageData = PROCESSING_STAGES[currentStageIndex];

  // Calculate overall progress
  const totalTime = PROCESSING_STAGES.reduce((sum, stage) => sum + stage.estimatedTime, 0);
  const completedTime = PROCESSING_STAGES
    .slice(0, currentStageIndex)
    .reduce((sum, stage) => sum + stage.estimatedTime, 0);

  // Smooth progress animation within current stage
  useEffect(() => {
    if (currentStage === 'complete') {
      setProgress(100);
      onComplete?.();
      return;
    }

    const stageStart = completedTime;
    const stageDuration = currentStageData.estimatedTime;
    const targetProgress = ((stageStart + stageDuration) / totalTime) * 100;

    // Animate progress smoothly
    const startProgress = (stageStart / totalTime) * 100;
    const progressIncrement = (targetProgress - startProgress) / (stageDuration / 100);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + progressIncrement;
        return next >= targetProgress ? targetProgress : next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStage, currentStageData, completedTime, totalTime, onComplete]);

  // Track elapsed time
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Обработка</span>
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500">
          {progress.toFixed(0)}%
        </div>
      </div>

      {/* Current Stage */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {currentStage === 'complete' ? (
              <div className="text-green-600">{currentStageData.icon}</div>
            ) : (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-900">
              {currentStageData.label}
            </p>
            {currentStage !== 'complete' && (
              <p className="text-sm text-gray-500 mt-1">
                Моля изчакайте...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stage List */}
      <div className="space-y-2">
        {PROCESSING_STAGES.map((stage, index) => {
          const isComplete = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div
              key={stage.id}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isCurrent
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : isComplete
                  ? 'bg-green-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0">
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    isCurrent
                      ? 'font-semibold text-blue-900'
                      : isComplete
                      ? 'text-green-700'
                      : 'text-gray-500'
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      {currentStage !== 'complete' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Съвет:</strong> За най-добри резултати, уверете се че касовата бележка е добре осветена и текстът е четлив.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage processing stages
 */
export function useProcessingStages() {
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('optimizing');
  const [error, setError] = useState<string | null>(null);

  const startProcessing = () => {
    setCurrentStage('optimizing');
    setError(null);
  };

  const moveToStage = (stage: ProcessingStage) => {
    setCurrentStage(stage);
  };

  const setProcessingError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const isComplete = currentStage === 'complete';

  return {
    currentStage,
    error,
    isComplete,
    startProcessing,
    moveToStage,
    setProcessingError,
  };
}

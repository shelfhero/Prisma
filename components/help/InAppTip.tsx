'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb } from 'lucide-react'

interface InAppTipProps {
  id: string
  title: string
  message: string
  showOnce?: boolean
  delay?: number
}

export function InAppTip({ id, title, message, showOnce = true, delay = 1000 }: InAppTipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const storageKey = `tip-dismissed-${id}`

  useEffect(() => {
    // Check if tip was already dismissed
    if (showOnce && localStorage.getItem(storageKey)) {
      return
    }

    // Show tip after delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [id, showOnce, delay, storageKey])

  const handleDismiss = () => {
    setIsVisible(false)
    if (showOnce) {
      localStorage.setItem(storageKey, 'true')
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-blue-600 text-white rounded-lg shadow-lg p-4 animate-slide-up z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lightbulb className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-blue-100">{message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
          aria-label="Затвори"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Predefined tips for common scenarios
export const TIPS = {
  firstUpload: {
    id: 'first-upload',
    title: 'Съвет за качване',
    message: 'Снимайте бона на добра светлина и уверете се, че текстът е четлив за най-добри резултати.'
  },
  firstBudget: {
    id: 'first-budget',
    title: 'Настройка на бюджет',
    message: 'Можете да коригирате бюджета всеки момент от настройките.'
  },
  receiptProcessing: {
    id: 'receipt-processing',
    title: 'Обработка на бон',
    message: 'Обработката отнема няколко секунди. Ще получите известие когато приключи.'
  },
  categoryEdit: {
    id: 'category-edit',
    title: 'Промяна на категория',
    message: 'Кликнете върху категорията за да я промените ръчно.'
  },
  budgetWarning: {
    id: 'budget-warning',
    title: 'Бюджет предупреждение',
    message: 'Приближавате лимита си за тази категория. Разгледайте разходите си в настройките.'
  }
}

// Hook for showing tips programmatically
export function useTip() {
  const showTip = (tipConfig: InAppTipProps) => {
    // You can trigger tips programmatically
    return tipConfig
  }

  return { showTip }
}

'use client'

import { useState, ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: string
  children?: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  icon?: boolean
}

export function Tooltip({ content, children, position = 'top', icon = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children || (
          icon ? (
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
          ) : (
            <span className="text-gray-400 hover:text-gray-600 transition-colors">?</span>
          )
        )}
      </div>

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 max-w-xs shadow-lg">
            {content}
            <div className={`absolute w-0 h-0 border-4 border-gray-900 ${arrowClasses[position]}`} />
          </div>
        </div>
      )}
    </div>
  )
}

// Specific tooltips for common features
export const TOOLTIPS = {
  budget: 'Задайте месечен лимит за всяка категория разходи',
  autoProcess: 'Автоматично разпознаване на информация от касовия бон',
  category: 'Категорията се определя автоматично, но може да я промените ръчно',
  merchant: 'Магазинът се разпознава от логото или текста на бона',
  confidence: 'Показва колко сигурна е системата в разпознаването',
  export: 'Изтеглете вашите данни като CSV или Excel файл',
  privacy: 'Всички данни са криптирани и само вие имате достъп до тях'
}

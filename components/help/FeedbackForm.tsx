'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-simple'

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'general'

interface FeedbackFormData {
  type: FeedbackType
  title: string
  description: string
  page?: string
  userAgent?: string
  screenResolution?: string
}

export default function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'general',
    title: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Get system info
      const systemInfo = {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
      }

      // Insert feedback
      const { error } = await supabase
        .from('beta_feedback')
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || null,
          feedback_type: formData.type,
          title: formData.title,
          description: formData.description,
          metadata: systemInfo,
        })

      if (error) throw error

      toast.success('Благодарим за обратната връзка!', {
        description: 'Вашето мнение е важно за нас и ще го разгледаме скоро.',
      })

      // Reset form
      setFormData({
        type: 'general',
        title: '',
        description: '',
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Грешка при изпращане на обратна връзка', {
        description: 'Моля, опитайте отново или се свържете с поддръжка.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Изпрати обратна връзка"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Обратна връзка</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Затвори"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as FeedbackType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="general">Общ коментар</option>
            <option value="bug">Докладване на грешка</option>
            <option value="feature">Нова функционалност</option>
            <option value="improvement">Подобрение</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Заглавие
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Накратко опишете проблема или идеята"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Предоставете повече детайли..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/1000 символа
          </p>
        </div>

        {/* Info Notice */}
        <p className="text-xs text-gray-500">
          Информация за браузъра и страницата ще бъде включена автоматично за по-добра диагностика.
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Изпращане...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Изпрати
            </>
          )}
        </button>
      </form>
    </div>
  )
}

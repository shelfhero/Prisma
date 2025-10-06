'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Bug, Camera, Loader2, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-simple'

interface BugReportData {
  title: string
  description: string
  stepsToReproduce: string
  expectedBehavior: string
  actualBehavior: string
  screenshot?: File
}

export default function BugReporter() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState<BugReportData>({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
  })

  // Keyboard shortcut to open bug reporter (Ctrl+Shift+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, screenshot: file })

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const captureScreenshot = async () => {
    try {
      // Close the modal temporarily for clean screenshot
      setIsOpen(false)

      await new Promise(resolve => setTimeout(resolve, 100))

      // @ts-ignore - experimental API
      if (navigator.mediaDevices?.getDisplayMedia) {
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' }
        })

        const track = stream.getVideoTracks()[0]
        // @ts-ignore
        const imageCapture = new ImageCapture(track)
        const bitmap = await imageCapture.grabFrame()

        // Convert to blob
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(bitmap, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'screenshot.png', { type: 'image/png' })
            setFormData({ ...formData, screenshot: file })
            setScreenshotPreview(canvas.toDataURL())
          }
        })

        track.stop()
        setIsOpen(true)
      } else {
        toast.error('Браузърът не поддържа заснемане на екрана')
        setIsOpen(true)
      }
    } catch (error) {
      console.error('Screenshot error:', error)
      setIsOpen(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Collect system info
      const systemInfo = {
        page: window.location.href,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString(),
        localStorageSize: localStorage.length,
        cookies: document.cookie.split(';').length,
      }

      // Upload screenshot if provided
      let screenshotUrl = null
      if (formData.screenshot) {
        const fileName = `bug-reports/${user?.id}/${Date.now()}-${formData.screenshot.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, formData.screenshot)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        screenshotUrl = publicUrl
      }

      // Insert bug report
      const { error } = await supabase
        .from('beta_feedback')
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || null,
          feedback_type: 'bug',
          title: formData.title,
          description: `## Описание\n${formData.description}\n\n## Стъпки за възпроизвеждане\n${formData.stepsToReproduce}\n\n## Очаквано поведение\n${formData.expectedBehavior}\n\n## Действително поведение\n${formData.actualBehavior}`,
          priority: 'medium',
          metadata: {
            ...systemInfo,
            screenshot_url: screenshotUrl,
          },
        })

      if (error) throw error

      toast.success('Благодарим за докладването на грешката!', {
        description: 'Екипът ни ще я разгледа възможно най-скоро.',
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: '',
      })
      setScreenshotPreview(null)
      setIsOpen(false)
    } catch (error) {
      console.error('Error submitting bug report:', error)
      toast.error('Грешка при изпращане на доклад', {
        description: 'Моля, опитайте отново.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-50"
        title="Докладвай грешка (Ctrl+Shift+B)"
        aria-label="Докладвай грешка"
      >
        <Bug className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-red-50">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Докладване на грешка</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Затвори"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Как да докладвате грешка ефективно:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Опишете точно какво се случи</li>
                <li>Дайте ясни стъпки как да се възпроизведе</li>
                <li>Прикачете снимка на екрана (ако е възможно)</li>
              </ul>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заглавие <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Накратко опишете грешката"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Какво точно се случи? Кога се случи?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Стъпки за възпроизвеждане <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              placeholder="1. Отидох на...&#10;2. Кликнах върху...&#10;3. Грешката се появи..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none font-mono text-sm"
              required
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Очаквано поведение <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.expectedBehavior}
                onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                placeholder="Какво очаквахте да се случи?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Действително поведение <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.actualBehavior}
                onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                placeholder="Какво всъщност се случи?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                required
              />
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Снимка на екрана (по избор)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={captureScreenshot}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Заснеми екрана
              </button>
              <label className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshot}
                  className="hidden"
                />
                Качи файл
              </label>
            </div>
            {screenshotPreview && (
              <div className="mt-3 relative">
                <img src={screenshotPreview} alt="Screenshot preview" className="w-full rounded-lg border border-gray-300" />
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotPreview(null)
                    setFormData({ ...formData, screenshot: undefined })
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Откажи
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Изпращане...
                </>
              ) : (
                <>
                  <Bug className="w-4 h-4" />
                  Изпрати доклад
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, MessageCircle, Book, Video } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: 'upload' | 'budget' | 'security' | 'general'
}

const faqs: FAQItem[] = [
  {
    question: 'Как да кача касов бон?',
    answer: 'Натиснете бутона "Качи бон" на главната страница. Снимайте бона на добра светлина, като текстът е четлив. Уверете се, че целият бон е в кадъра. След качване, системата автоматично разпознава информацията.',
    category: 'upload'
  },
  {
    question: 'Защо категорията е грешна?',
    answer: 'Системата автоматично определя категорията въз основа на магазина и продуктите. Ако категорията е грешна, можете да я промените ръчно като отворите бона и изберете правилната категория от падащото меню.',
    category: 'general'
  },
  {
    question: 'Как да променя бюджета си?',
    answer: 'Отидете в "Настройки" от менюто и изберете "Бюджет". Можете да зададете месечен бюджет за всяка категория. Промените се прилагат веднага и можете да ги коригирате по всяко време.',
    category: 'budget'
  },
  {
    question: 'Данните ми сигурни ли са?',
    answer: 'Да! Всички данни са криптирани и съхранявани сигурно. Само вие имате достъп до вашите касови бонове. Ние не споделяме данните ви с трети страни. Можете да изтриете акаунта си и всички данни по всяко време.',
    category: 'security'
  },
  {
    question: 'Как да изтрия касов бон?',
    answer: 'Отворете бона който искате да изтриете. В горния десен ъгъл ще видите бутон "Изтрий". След потвърждение, бонът ще бъде изтрит завинаги.',
    category: 'general'
  },
  {
    question: 'Мога ли да експортирам данните си?',
    answer: 'Да, можете да експортирате всички ваши бонове като CSV или Excel файл от страницата "Настройки". Това ви позволява да анализирате разходите си в други програми.',
    category: 'general'
  },
  {
    question: 'Какво означават различните статуси на бона?',
    answer: 'Обработва се - бонът се анализира; Одобрен - успешно обработен; Грешка - проблем при обработката; На изчакване - чака ръчна проверка.',
    category: 'upload'
  },
  {
    question: 'Колко бонове мога да кача?',
    answer: 'Няма ограничение за броя бонове. Можете да качвате неограничен брой касови бонове в безплатната версия.',
    category: 'upload'
  },
  {
    question: 'Как работи автоматичното разпознаване?',
    answer: 'Използваме OCR (оптично разпознаване на символи) и AI технология за разпознаване на текста от бона. Системата автоматично извлича дата, сума, магазин и категория.',
    category: 'upload'
  },
  {
    question: 'Какво да правя ако разпознаването е грешно?',
    answer: 'Можете ръчно да коригирате всяка информация като отворите бона и редактирате полетата. Вашите корекции помагат на системата да се подобрява.',
    category: 'general'
  }
]

const categories = {
  upload: 'Качване на бонове',
  budget: 'Бюджет',
  security: 'Сигурност',
  general: 'Общи въпроси'
}

export default function HelpPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showContactForm, setShowContactForm] = useState(false)

  const filteredFAQs = selectedCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === selectedCategory)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Помощ и Поддръжка</h1>
        <p className="text-gray-600">Намерете отговори на често задавани въпроси или се свържете с нас</p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <a
          href="#faq"
          className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Book className="w-6 h-6 text-blue-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Често задавани въпроси</h3>
          <p className="text-sm text-gray-600">Бързи отговори на популярни въпроси</p>
        </a>

        <a
          href="#tutorials"
          className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <Video className="w-6 h-6 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Видео уроци</h3>
          <p className="text-sm text-gray-600">Научете как да използвате приложението</p>
        </a>

        <button
          onClick={() => setShowContactForm(true)}
          className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
        >
          <MessageCircle className="w-6 h-6 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Свържете се с нас</h3>
          <p className="text-sm text-gray-600">Отговаряме в рамките на 24-48 часа</p>
        </button>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Често задавани въпроси</h2>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Всички
          </button>
          {Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFAQs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                {expandedFAQ === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedFAQ === index && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Video Tutorials Section */}
      <div id="tutorials" className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Видео уроци</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Как да качите касов бон</h3>
            <p className="text-sm text-gray-600">Научете как да снимате и качвате бонове за най-добри резултати</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Настройка на бюджет</h3>
            <p className="text-sm text-gray-600">Как да зададете месечен бюджет за различни категории</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Преглед на разходи</h3>
            <p className="text-sm text-gray-600">Научете как да анализирате вашите разходи и да откриете спестявания</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Корекция на информация</h3>
            <p className="text-sm text-gray-600">Как ръчно да коригирате разпознатата информация от бона</p>
          </div>
        </div>
      </div>

      {/* Contact Support Section */}
      <div id="contact" className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Не намерихте отговор?</h2>
        <p className="text-gray-700 mb-6">
          Свържете се с нашия екип за поддръжка. Отговаряме в рамките на 24-48 часа.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="mailto:office@myshelfhero.com"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Mail className="w-5 h-5 mr-2" />
            office@myshelfhero.com
          </a>

          <button
            onClick={() => setShowContactForm(true)}
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Изпрати запитване
          </button>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactFormModal onClose={() => setShowContactForm(false)} />
      )}
    </div>
  )
}

function ContactFormModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Благодарим!</h3>
            <p className="text-gray-600">Вашето съобщение е изпратено успешно.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Свържете се с нас</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Име</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имейл</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Съобщение</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Изпраща се...' : 'Изпрати'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отказ
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Bulgarian Text Display Test Component
 * Tests proper rendering of Bulgarian Cyrillic text
 */

'use client';

import { useState } from 'react';

interface TextSample {
  category: string;
  samples: {
    text: string;
    description: string;
    expectedEncoding?: string;
  }[];
}

const BULGARIAN_TEXT_SAMPLES: TextSample[] = [
  {
    category: 'Основни функции',
    samples: [
      {
        text: 'Добре дошли в Призма!',
        description: 'Приветствие на главната страница'
      },
      {
        text: 'Регистрация',
        description: 'Бутон за регистрация'
      },
      {
        text: 'Вход',
        description: 'Бутон за вход'
      },
      {
        text: 'Изход',
        description: 'Бутон за изход'
      },
      {
        text: 'Настройки',
        description: 'Меню за настройки'
      }
    ]
  },
  {
    category: 'Касови бележки',
    samples: [
      {
        text: 'Сканирай касова бележка',
        description: 'Основна функция'
      },
      {
        text: 'Добави бележка ръчно',
        description: 'Алтернативен начин'
      },
      {
        text: 'Последни бележки',
        description: 'Списък с бележки'
      },
      {
        text: 'Общо разходи',
        description: 'Сума на разходите'
      },
      {
        text: 'Средна стойност',
        description: 'Статистика'
      }
    ]
  },
  {
    category: 'Категории и продукти',
    samples: [
      {
        text: 'Хранителни продукти',
        description: 'Основна категория'
      },
      {
        text: 'Напитки',
        description: 'Категория напитки'
      },
      {
        text: 'Домакински принадлежности',
        description: 'Дълго име на категория'
      },
      {
        text: 'Козметика и лична хигиена',
        description: 'Специални символи'
      },
      {
        text: 'Детски храни и играчки',
        description: 'Смесени категории'
      }
    ]
  },
  {
    category: 'Съобщения за грешки',
    samples: [
      {
        text: 'Възникна грешка при зареждане на данните',
        description: 'Стандартна грешка'
      },
      {
        text: 'Неуспешно качване на файла',
        description: 'Грешка при upload'
      },
      {
        text: 'Невалиден имейл адрес',
        description: 'Валидационна грешка'
      },
      {
        text: 'Паролата трябва да съдържа поне 8 символа',
        description: 'Изискване за парола'
      },
      {
        text: 'Сесията ви е изтекла. Моля, влезте отново.',
        description: 'Проблем с автентикация'
      }
    ]
  },
  {
    category: 'Дати и валути',
    samples: [
      {
        text: '25,50 лв.',
        description: 'Български лев с децимали'
      },
      {
        text: '1 234,56 лв.',
        description: 'По-голяма сума с разделители'
      },
      {
        text: '15 септември 2024 г.',
        description: 'Българско форматиране на дата'
      },
      {
        text: 'вчера в 14:30',
        description: 'Относително време'
      },
      {
        text: 'този месец',
        description: 'Период от време'
      }
    ]
  },
  {
    category: 'Специални символи',
    samples: [
      {
        text: 'АБВ абв ЯЮЯ яюя',
        description: 'Главни и малки букви'
      },
      {
        text: 'БДЖ → български думи и знаци',
        description: 'Специални символи'
      },
      {
        text: 'Продукт №1 - 100% качество',
        description: 'Цифри и символи'
      },
      {
        text: 'E-mail: test@prizma.bg',
        description: 'Латински + кирилица'
      },
      {
        text: 'Тел.: +359 2 123 456',
        description: 'Телефонен номер'
      }
    ]
  }
];

export default function BulgarianTextTest() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});

  const testTextRendering = (text: string, key: string) => {
    // Simple test to check if text renders correctly
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setTestResults(prev => ({ ...prev, [key]: false }));
      return;
    }

    ctx.font = '16px Inter, sans-serif';
    const width = ctx.measureText(text).width;

    // If width is 0 or very small, the text might not be rendering properly
    const isRendering = width > 0 && width > text.length * 2;

    setTestResults(prev => ({ ...prev, [key]: isRendering }));
  };

  const testAllTexts = () => {
    BULGARIAN_TEXT_SAMPLES.forEach(category => {
      category.samples.forEach((sample, index) => {
        const key = `${category.category}-${index}`;
        testTextRendering(sample.text, key);
      });
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          🇧🇬 Тест на българския текст
        </h3>
        <button
          onClick={testAllTexts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Тествай всички текстове
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category List */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Категории</h4>
          <div className="space-y-2">
            {BULGARIAN_TEXT_SAMPLES.map((category) => (
              <button
                key={category.category}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.category ? null : category.category
                )}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  selectedCategory === category.category
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.category}
              </button>
            ))}
          </div>
        </div>

        {/* Text Samples */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            {selectedCategory ? `Текстове от "${selectedCategory}"` : 'Изберете категория'}
          </h4>

          {selectedCategory && (
            <div className="space-y-3">
              {BULGARIAN_TEXT_SAMPLES
                .find(cat => cat.category === selectedCategory)
                ?.samples.map((sample, index) => {
                  const key = `${selectedCategory}-${index}`;
                  const testResult = testResults[key];

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-lg font-medium text-gray-900 mb-1">
                            {sample.text}
                          </div>
                          <div className="text-sm text-gray-600">
                            {sample.description}
                          </div>
                        </div>

                        {testResult !== undefined && (
                          <div className={`ml-4 px-2 py-1 rounded text-xs font-medium ${
                            testResult
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {testResult ? 'OK' : 'Проблем'}
                          </div>
                        )}
                      </div>

                      {/* Font Test */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 mb-1">Inter font:</div>
                          <div style={{ fontFamily: 'Inter, sans-serif' }}>
                            {sample.text}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-1">System font:</div>
                          <div style={{ fontFamily: 'system-ui, sans-serif' }}>
                            {sample.text}
                          </div>
                        </div>
                      </div>

                      {/* Character encoding info */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <details>
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Техническа информация
                          </summary>
                          <div className="mt-2 text-xs text-gray-400 font-mono">
                            <div>Дължина: {sample.text.length} символа</div>
                            <div>UTF-8: {new TextEncoder().encode(sample.text).length} байта</div>
                            <div>
                              Кодировка: {sample.text.split('').map(char =>
                                `U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
                              ).join(' ')}
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Font Loading Test */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Тест на шрифтовете</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">Inter (Cyrillic)</div>
            <div className="text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
              АБВГДЕабвгде
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">System UI</div>
            <div className="text-lg" style={{ fontFamily: 'system-ui, sans-serif' }}>
              АБВГДЕабвгде
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">Sans-serif</div>
            <div className="text-lg" style={{ fontFamily: 'sans-serif' }}>
              АБВГДЕабвгде
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Инструкции за тестване:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Изберете категория от лявата страна</li>
          <li>• Проверете дали всички текстове се показват правилно</li>
          <li>• Натиснете "Тествай всички текстове" за автоматична проверка</li>
          <li>• Уверете се, че няма квадратчета (□) вместо букви</li>
          <li>• Проверете дали специалните символи се показват коректно</li>
        </ul>
      </div>
    </div>
  );
}
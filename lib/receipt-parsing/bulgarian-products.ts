/**
 * Bulgarian Product Recognition and Categorization System
 * Handles common products, misspellings, and automatic categorization
 */

import { BulgarianProduct } from './types';

export const BULGARIAN_PRODUCTS: BulgarianProduct[] = [
  // Dairy Products
  {
    name: 'Мляко',
    alternatives: ['Мляко прясно', 'Мляко краве', 'Мляко 3.6%', 'Мляко 2.8%'],
    category: 'Млечни продукти',
    commonMisspellings: ['Мпяко', 'Мляк0', 'Млsко', 'Млаko'],
    priceRange: { min: 2.0, max: 3.5, unit: 'лв/л' },
    keywords: ['мляко', 'млако', 'milk'],
    brands: ['Верея', 'БДС', 'Боби', 'Оргин']
  },
  {
    name: 'Кисело мляко',
    alternatives: ['Кисело мляко 2%', 'Кисело мляко 3.6%', 'Йогурт'],
    category: 'Млечни продукти',
    commonMisspellings: ['Кисе9о мляко', 'Киселo млакo', 'Кисел0 мляко'],
    priceRange: { min: 1.5, max: 2.8, unit: 'лв/400г' },
    keywords: ['кисело', 'йогурт', 'yogurt'],
    brands: ['БДС', 'Данон', 'Биволско']
  },
  {
    name: 'Сирене бяло',
    alternatives: ['Сирене краве', 'Бяло сирене', 'Сирене салатно'],
    category: 'Млечни продукти',
    commonMisspellings: ['Сире8е', 'Сиpене', 'Сирене6яло'],
    priceRange: { min: 8.0, max: 18.0, unit: 'лв/кг' },
    keywords: ['сирене', 'бяло', 'краве']
  },
  {
    name: 'Кашкавал',
    alternatives: ['Кашкавал жълт', 'Кашкавал краве', 'Кашкавал овче'],
    category: 'Млечни продукти',
    commonMisspellings: ['Кашкава9', 'Кащкавал', 'Кашкsвал'],
    priceRange: { min: 12.0, max: 25.0, unit: 'лв/кг' },
    keywords: ['кашкавал', 'жълт']
  },

  // Bread and Bakery
  {
    name: 'Хляб',
    alternatives: ['Хляб бял', 'Хляб черен', 'Хляб пълнозърнест', 'Хлеб'],
    category: 'Хлебни изделия',
    commonMisspellings: ['Хля6', 'Х9яб', 'Хлsб', 'Хле6'],
    priceRange: { min: 0.8, max: 2.0, unit: 'лв/бр' },
    keywords: ['хляб', 'хлеб', 'bread', 'бял', 'черен']
  },
  {
    name: 'Питка',
    alternatives: ['Питка бяла', 'Питка с мак', 'Питка с чубрица'],
    category: 'Хлебни изделия',
    commonMisspellings: ['Питkа', 'Пи7ка', 'Питkа'],
    priceRange: { min: 1.0, max: 2.5, unit: 'лв/бр' },
    keywords: ['питка']
  },

  // Fruits
  {
    name: 'Банани',
    alternatives: ['Банани Еквадор', 'Банани Колумбия'],
    category: 'Плодове',
    commonMisspellings: ['Банани', '6анани', 'Банан1', 'Бананu'],
    priceRange: { min: 2.5, max: 4.0, unit: 'лв/кг' },
    keywords: ['банани', 'банан', 'banana']
  },
  {
    name: 'Ябълки',
    alternatives: ['Ябълки червени', 'Ябълки зелени', 'Ябълки Гала'],
    category: 'Плодове',
    commonMisspellings: ['Я6ълки', 'Ябъ9ки', 'Ябълkи', 'Я6ълku'],
    priceRange: { min: 2.0, max: 5.0, unit: 'лв/кг' },
    keywords: ['ябълки', 'ябълка', 'apple', 'червени', 'зелени']
  },
  {
    name: 'Портокали',
    alternatives: ['Портокали Валенсия', 'Портокали сладки'],
    category: 'Плодове',
    commonMisspellings: ['Портока9и', 'Портокаlu', 'Пор7окали'],
    priceRange: { min: 2.5, max: 4.5, unit: 'лв/кг' },
    keywords: ['портокали', 'портокал', 'orange']
  },

  // Vegetables
  {
    name: 'Домати',
    alternatives: ['Домати розови', 'Домати червени', 'Домати чери'],
    category: 'Зеленчуци',
    commonMisspellings: ['Домати', 'Д0мати', 'Доматu', 'Дoмати'],
    priceRange: { min: 3.0, max: 6.0, unit: 'лв/кг' },
    keywords: ['домати', 'домат', 'tomato', 'розови', 'червени']
  },
  {
    name: 'Краставици',
    alternatives: ['Краставици салатни', 'Краставици оранжерийни'],
    category: 'Зеленчуци',
    commonMisspellings: ['Крас7авици', 'Краставицu', 'Краstaвици'],
    priceRange: { min: 2.0, max: 4.0, unit: 'лв/кг' },
    keywords: ['краставици', 'краставица', 'cucumber']
  },
  {
    name: 'Лук',
    alternatives: ['Лук бял', 'Лук червен', 'Лук жълт'],
    category: 'Зеленчуци',
    commonMisspellings: ['9ук', 'Лyk', 'Лук'],
    priceRange: { min: 1.5, max: 3.0, unit: 'лв/кг' },
    keywords: ['лук', 'onion', 'бял', 'червен']
  },

  // Meat Products
  {
    name: 'Салам',
    alternatives: ['Салам варен', 'Салам сух', 'Салам телешки'],
    category: 'Месни продукти',
    commonMisspellings: ['Са9ам', 'Салaм', 'Салsм'],
    priceRange: { min: 8.0, max: 20.0, unit: 'лв/кг' },
    keywords: ['салам', 'салами', 'salami']
  },
  {
    name: 'Шунка',
    alternatives: ['Шунка варена', 'Шунка пушена', 'Шунка пилешка'],
    category: 'Месни продукти',
    commonMisspellings: ['Шуnка', 'Шунkа', '0унка'],
    priceRange: { min: 10.0, max: 25.0, unit: 'лв/кг' },
    keywords: ['шунка', 'ham', 'варена', 'пушена']
  },

  // Beverages
  {
    name: 'Вода',
    alternatives: ['Вода минерална', 'Вода изворна', 'Вода газирана'],
    category: 'Напитки',
    commonMisspellings: ['В0да', 'Водa', 'Boда'],
    priceRange: { min: 0.5, max: 2.0, unit: 'лв/л' },
    keywords: ['вода', 'water', 'минерална', 'изворна'],
    brands: ['Девин', 'Банкя', 'Горна Баня']
  },
  {
    name: 'Кока Кола',
    alternatives: ['Coca Cola', 'Кола', 'Кока-Кола'],
    category: 'Напитки',
    commonMisspellings: ['К0ка Кола', 'Кока К09а', 'Коkа Кола'],
    priceRange: { min: 1.5, max: 3.0, unit: 'лв/л' },
    keywords: ['кока', 'кола', 'coca', 'cola']
  },

  // Cleaning Products
  {
    name: 'Препарат за съдове',
    alternatives: ['Фейри', 'Детергент за съдове', 'Течност за съдове'],
    category: 'Битова химия',
    commonMisspellings: ['Препарат 3а съдове', 'Препаpaт', 'Фейpu'],
    priceRange: { min: 2.0, max: 8.0, unit: 'лв/бр' },
    keywords: ['препарат', 'съдове', 'фейри', 'fairy', 'детергент']
  },
  {
    name: 'Прах за пране',
    alternatives: ['Ариел', 'Детергент за пране', 'Прах пералня'],
    category: 'Битова химия',
    commonMisspellings: ['Прах 3а пране', 'Apиел', 'Праx'],
    priceRange: { min: 5.0, max: 15.0, unit: 'лв/бр' },
    keywords: ['прах', 'пране', 'ариел', 'ariel', 'детергент']
  }
];

export const PRODUCT_CATEGORIES = {
  'Млечни продукти': ['мляко', 'сирене', 'кашкавал', 'йогурт', 'краве сирене', 'овче сирене'],
  'Хлебни изделия': ['хляб', 'питка', 'кифла', 'багета', 'тост'],
  'Плодове': ['ябълки', 'банани', 'портокали', 'круши', 'грозде', 'праскови'],
  'Зеленчуци': ['домати', 'краставици', 'лук', 'картофи', 'моркови', 'чушки'],
  'Месни продукти': ['салам', 'шунка', 'наденица', 'суджук', 'месо', 'пилешко'],
  'Напитки': ['вода', 'сок', 'кола', 'бира', 'кафе', 'чай'],
  'Битова химия': ['препарат', 'прах', 'омекотител', 'белина', 'сапун'],
  'Козметика': ['шампоан', 'сапун', 'крем', 'паста за зъби', 'дезодорант']
};

export function recognizeBulgarianProduct(text: string): {
  product: BulgarianProduct | null;
  confidence: number;
  matchType: 'exact' | 'alternative' | 'keyword' | 'misspelling'
} {
  const normalizedText = text.toLowerCase().trim();

  // Exact name match
  for (const product of BULGARIAN_PRODUCTS) {
    if (normalizedText === product.name.toLowerCase()) {
      return { product, confidence: 0.95, matchType: 'exact' };
    }
  }

  // Alternative names
  for (const product of BULGARIAN_PRODUCTS) {
    for (const alt of product.alternatives) {
      if (normalizedText.includes(alt.toLowerCase()) || alt.toLowerCase().includes(normalizedText)) {
        return { product, confidence: 0.85, matchType: 'alternative' };
      }
    }
  }

  // Keyword matching
  for (const product of BULGARIAN_PRODUCTS) {
    for (const keyword of product.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        return { product, confidence: 0.75, matchType: 'keyword' };
      }
    }
  }

  // Misspelling detection (Levenshtein distance)
  for (const product of BULGARIAN_PRODUCTS) {
    for (const misspelling of product.commonMisspellings) {
      if (levenshteinDistance(normalizedText, misspelling.toLowerCase()) <= 1) {
        return { product, confidence: 0.65, matchType: 'misspelling' };
      }
    }
  }

  return { product: null, confidence: 0, matchType: 'exact' };
}

export function categorizeBulgarianProduct(productName: string): string {
  const normalizedName = productName.toLowerCase();

  for (const [category, keywords] of Object.entries(PRODUCT_CATEGORIES)) {
    for (const keyword of keywords) {
      if (normalizedName.includes(keyword)) {
        return category;
      }
    }
  }

  // Try product recognition for better categorization
  const recognition = recognizeBulgarianProduct(productName);
  if (recognition.product && recognition.confidence > 0.6) {
    return recognition.product.category;
  }

  return 'Други';
}

export function validateBulgarianProductPrice(productName: string, price: number): {
  valid: boolean;
  confidence: number;
  explanation: string;
} {
  const recognition = recognizeBulgarianProduct(productName);

  if (!recognition.product) {
    return {
      valid: true,
      confidence: 0.5,
      explanation: 'Продуктът не е разпознат - не може да се валидира цената'
    };
  }

  const { min, max } = recognition.product.priceRange;
  const isInRange = price >= min && price <= max;

  if (isInRange) {
    return {
      valid: true,
      confidence: 0.9,
      explanation: `Цената ${price.toFixed(2)} лв е в очаквания диапазон ${min}-${max} лв`
    };
  }

  const deviation = price < min ? ((min - price) / min) : ((price - max) / max);

  if (deviation <= 0.5) { // Within 50% of expected range
    return {
      valid: true,
      confidence: 0.7,
      explanation: `Цената е извън очаквания диапазон, но в разумни граници`
    };
  }

  return {
    valid: false,
    confidence: 0.3,
    explanation: `Цената ${price.toFixed(2)} лв е значително извън очаквания диапазон ${min}-${max} лв`
  };
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}
/**
 * Bulgarian formatting utilities for Призма
 * Handles currency, date, number, and text formatting according to Bulgarian standards
 */

export const BULGARIAN_MONTHS = [
  { value: 1, label: 'Януари', short: 'Ян' },
  { value: 2, label: 'Февруари', short: 'Фев' },
  { value: 3, label: 'Март', short: 'Мар' },
  { value: 4, label: 'Април', short: 'Апр' },
  { value: 5, label: 'Май', short: 'Май' },
  { value: 6, label: 'Юни', short: 'Юни' },
  { value: 7, label: 'Юли', short: 'Юли' },
  { value: 8, label: 'Август', short: 'Авг' },
  { value: 9, label: 'Септември', short: 'Сеп' },
  { value: 10, label: 'Октомври', short: 'Окт' },
  { value: 11, label: 'Ноември', short: 'Ное' },
  { value: 12, label: 'Декември', short: 'Дек' },
];

export const BULGARIAN_WEEKDAYS = [
  'неделя', 'понedelник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'
];

export const BULGARIAN_UNITS = {
  'kg': 'кг',
  'g': 'гр',
  'l': 'л',
  'ml': 'мл',
  'pcs': 'бр',
  'pack': 'пак',
  'bottle': 'бут',
  'box': 'кут'
};

/**
 * Format currency in Bulgarian Leva
 */
export function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

/**
 * Format number with Bulgarian locale
 */
export function formatBulgarianNumber(num: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('bg-BG', options).format(num);
}

/**
 * Format percentage with Bulgarian locale
 */
export function formatBulgarianPercentage(percentage: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
}

/**
 * Format date in Bulgarian format (DD.MM.YYYY)
 */
export function formatBulgarianDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format date and time in Bulgarian format
 */
export function formatBulgarianDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format long date with month name in Bulgarian
 */
export function formatBulgarianLongDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = BULGARIAN_MONTHS[date.getMonth()].label.toLowerCase();
  const year = date.getFullYear();

  return `${day} ${month} ${year} г.`;
}

/**
 * Format quantity with unit in Bulgarian
 */
export function formatQuantity(quantity: number, unit?: string | null): string {
  const formattedQty = formatBulgarianNumber(quantity);

  if (!unit) {
    return `${formattedQty} бр.`;
  }

  // Translate common units to Bulgarian
  const bulgarianUnit = BULGARIAN_UNITS[unit as keyof typeof BULGARIAN_UNITS] || unit;
  return `${formattedQty} ${bulgarianUnit}`;
}

/**
 * Format month and year for display
 */
export function formatMonthYear(month: number, year: number): string {
  const monthName = BULGARIAN_MONTHS.find(m => m.value === month)?.label || 'Неизвестен';
  return `${monthName} ${year} г.`;
}

/**
 * Get relative time string in Bulgarian
 */
export function getBulgarianRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'днес';
  if (diffInDays === 1) return 'вчера';
  if (diffInDays === 2) return 'онзи ден';
  if (diffInDays < 7) return `преди ${diffInDays} дни`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `преди ${weeks} ${weeks === 1 ? 'седмица' : 'седмици'}`;
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `преди ${months} ${months === 1 ? 'месец' : 'месеца'}`;
  }

  const years = Math.floor(diffInDays / 365);
  return `преди ${years} ${years === 1 ? 'година' : 'години'}`;
}

/**
 * Format price range
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatBulgarianCurrency(min);
  return `${formatBulgarianCurrency(min)} - ${formatBulgarianCurrency(max)}`;
}

/**
 * Format spending trend text
 */
export function formatSpendingTrend(
  trend: 'up' | 'down' | 'stable',
  percentage: number
): string {
  const formattedPercentage = Math.abs(percentage).toFixed(1);

  switch (trend) {
    case 'up':
      return `↗️ увеличение с ${formattedPercentage}%`;
    case 'down':
      return `↘️ намаление с ${formattedPercentage}%`;
    case 'stable':
      return `→ стабилно (${formattedPercentage}%)`;
    default:
      return 'няма данни';
  }
}

/**
 * Format budget status text
 */
export function formatBudgetStatus(
  used: number,
  budget: number
): { status: 'good' | 'warning' | 'danger'; text: string; color: string } {
  const percentage = (used / budget) * 100;

  if (percentage <= 75) {
    return {
      status: 'good',
      text: `✅ В рамките на бюджета (${percentage.toFixed(1)}%)`,
      color: 'text-green-600'
    };
  } else if (percentage <= 90) {
    return {
      status: 'warning',
      text: `⚠️ Внимание - близо до лимита (${percentage.toFixed(1)}%)`,
      color: 'text-yellow-600'
    };
  } else if (percentage <= 100) {
    return {
      status: 'danger',
      text: `🔸 Почти изчерпан бюджет (${percentage.toFixed(1)}%)`,
      color: 'text-orange-600'
    };
  } else {
    return {
      status: 'danger',
      text: `❌ Бюджетът е превишен с ${formatBulgarianCurrency(used - budget)}`,
      color: 'text-red-600'
    };
  }
}

/**
 * Pluralize Bulgarian words
 */
export function pluralizeBulgarian(
  count: number,
  singular: string,
  plural: string,
  special?: string
): string {
  if (count === 1) return singular;
  if (count === 2 && special) return special;
  return plural;
}

/**
 * Common pluralization helpers
 */
export const BulgarianPlurals = {
  products: (count: number) => pluralizeBulgarian(count, 'продукт', 'продукта'),
  receipts: (count: number) => pluralizeBulgarian(count, 'бележка', 'бележки'),
  stores: (count: number) => pluralizeBulgarian(count, 'магазин', 'магазина'),
  categories: (count: number) => pluralizeBulgarian(count, 'категория', 'категории'),
  days: (count: number) => pluralizeBulgarian(count, 'ден', 'дни'),
  weeks: (count: number) => pluralizeBulgarian(count, 'седмица', 'седмици'),
  months: (count: number) => pluralizeBulgarian(count, 'месец', 'месеца'),
  years: (count: number) => pluralizeBulgarian(count, 'година', 'години'),
};

/**
 * Format file size in Bulgarian
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['байта', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 байта';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);

  return `${size} ${sizes[i]}`;
}

/**
 * Validation messages in Bulgarian
 */
export const BulgarianValidationMessages = {
  required: 'Това поле е задължително',
  email: 'Моля въведете валиден имейл адрес',
  minLength: (min: number) => `Минимум ${min} символа`,
  maxLength: (max: number) => `Максимум ${max} символа`,
  numeric: 'Моля въведете число',
  positive: 'Моля въведете положително число',
  decimal: 'Моля въведете валидно десетично число',
  date: 'Моля въведете валидна дата',
  phone: 'Моля въведете валиден телефонен номер',
  password: 'Паролата трябва да съдържа поне 8 символа',
  confirmPassword: 'Паролите не съвпадат',
  fileSize: (maxMB: number) => `Файлът трябва да е по-малко от ${maxMB}MB`,
  fileType: (types: string[]) => `Поддържани формати: ${types.join(', ')}`,
};
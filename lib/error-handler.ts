/**
 * Centralized Error Handling for Призма
 * Translates technical errors to user-friendly Bulgarian messages
 */

export type ErrorType =
  | 'network'
  | 'auth'
  | 'validation'
  | 'budget'
  | 'upload'
  | 'ocr'
  | 'database'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  title: string;
  message: string;
  technicalMessage?: string;
  action?: {
    label: string;
    handler: () => void;
  };
  canRetry: boolean;
  showSupport: boolean;
}

/**
 * Convert any error to a user-friendly Bulgarian error
 */
export function translateError(error: any, context?: string): AppError {
  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('offline')) {
    return {
      type: 'network',
      title: 'Няма връзка с интернет',
      message: 'Моля, проверете интернет връзката си и опитайте отново.',
      technicalMessage: error.message,
      canRetry: true,
      showSupport: false,
    };
  }

  // Auth errors
  if (error.message?.includes('auth') || error.message?.includes('unauthorized') || error.status === 401) {
    return {
      type: 'auth',
      title: 'Изтекла сесия',
      message: 'Вашата сесия е изтекла. Моля, влезте отново в профила си.',
      technicalMessage: error.message,
      canRetry: false,
      showSupport: false,
    };
  }

  // Supabase specific errors
  if (error.code === '23505') {
    return {
      type: 'validation',
      title: 'Дублиран запис',
      message: 'Този запис вече съществува в системата.',
      technicalMessage: error.message,
      canRetry: false,
      showSupport: true,
    };
  }

  if (error.code === '23503') {
    return {
      type: 'validation',
      title: 'Невалидна връзка',
      message: 'Записът, който се опитвате да използвате, не съществува.',
      technicalMessage: error.message,
      canRetry: false,
      showSupport: true,
    };
  }

  if (error.code === 'PGRST116') {
    return {
      type: 'database',
      title: 'Записът не е намерен',
      message: 'Търсеният запис не съществува или е бил изтрит.',
      technicalMessage: error.message,
      canRetry: false,
      showSupport: true,
    };
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
    return {
      type: 'network',
      title: 'Заявката отне твърде много време',
      message: 'Сървърът не отговори навреме. Моля, опитайте отново.',
      technicalMessage: error.message,
      canRetry: true,
      showSupport: false,
    };
  }

  // File upload errors
  if (error.message?.includes('file') || error.message?.includes('upload')) {
    return {
      type: 'upload',
      title: 'Грешка при качване',
      message: 'Файлът не може да бъде качен. Моля, проверете размера и формата на файла.',
      technicalMessage: error.message,
      canRetry: true,
      showSupport: true,
    };
  }

  // OCR errors
  if (context === 'ocr' || error.message?.includes('vision') || error.message?.includes('OCR')) {
    return {
      type: 'ocr',
      title: 'Грешка при разпознаване',
      message: 'Не успяхме да разпознаем текста от снимката. Моля, опитайте с по-ясна снимка или въведете данните ръчно.',
      technicalMessage: error.message,
      canRetry: true,
      showSupport: true,
    };
  }

  // Default error
  return {
    type: 'unknown',
    title: 'Нещо се обърка',
    message: 'Възникна неочаквана грешка. Моля, опитайте отново или се свържете с поддръжка.',
    technicalMessage: error.message || String(error),
    canRetry: true,
    showSupport: true,
  };
}

/**
 * Budget-specific validation errors
 */
export const BudgetErrors = {
  negativeBudget: (): AppError => ({
    type: 'validation',
    title: 'Невалиден бюджет',
    message: 'Бюджетът не може да бъде отрицателен. Моля, въведете положителна сума.',
    canRetry: false,
    showSupport: false,
  }),

  totalMismatch: (expected: number, actual: number): AppError => ({
    type: 'validation',
    title: 'Несъответствие в сумата',
    message: `Сумата по категории (${actual.toFixed(2)} лв) не съвпада с общия бюджет (${expected.toFixed(2)} лв). Моля, проверете разпределението.`,
    canRetry: false,
    showSupport: false,
  }),

  categoryOverBudget: (category: string, spent: number, limit: number): AppError => ({
    type: 'budget',
    title: 'Надвишен бюджет',
    message: `Надвишихте бюджета за "${category}". Похарчили сте ${spent.toFixed(2)} лв от ${limit.toFixed(2)} лв.`,
    canRetry: false,
    showSupport: false,
  }),

  totalOverBudget: (spent: number, limit: number): AppError => ({
    type: 'budget',
    title: 'Надвишен общ бюджет',
    message: `Похарчили сте ${spent.toFixed(2)} лв от общия бюджет ${limit.toFixed(2)} лв.`,
    canRetry: false,
    showSupport: false,
  }),

  noBudget: (): AppError => ({
    type: 'validation',
    title: 'Няма бюджет',
    message: 'Все още не сте създали бюджет. Създайте бюджет за да следите разходите си.',
    canRetry: false,
    showSupport: false,
  }),

  invalidCategory: (category: string): AppError => ({
    type: 'validation',
    title: 'Невалидна категория',
    message: `Категорията "${category}" не съществува. Моля, изберете валидна категория.`,
    canRetry: false,
    showSupport: false,
  }),

  zeroBudget: (): AppError => ({
    type: 'validation',
    title: 'Нулев бюджет',
    message: 'Бюджетът трябва да бъде по-голям от 0. Моля, въведете валидна сума.',
    canRetry: false,
    showSupport: false,
  }),

  budgetTooLarge: (max: number): AppError => ({
    type: 'validation',
    title: 'Твърде голям бюджет',
    message: `Бюджетът не може да надвишава ${max.toLocaleString('bg-BG')} лв. Моля, въведете по-малка сума.`,
    canRetry: false,
    showSupport: false,
  }),
};

/**
 * Receipt/Upload specific errors
 */
export const ReceiptErrors = {
  fileTooBig: (maxSizeMB: number): AppError => ({
    type: 'upload',
    title: 'Файлът е твърде голям',
    message: `Файлът не може да бъде по-голям от ${maxSizeMB}MB. Моля, компресирайте снимката или изберете друг файл.`,
    canRetry: false,
    showSupport: false,
  }),

  invalidFileType: (): AppError => ({
    type: 'upload',
    title: 'Невалиден формат',
    message: 'Моля, качете снимка във формат JPG, PNG или PDF.',
    canRetry: false,
    showSupport: false,
  }),

  blurryImage: (): AppError => ({
    type: 'ocr',
    title: 'Неясна снимка',
    message: 'Снимката е твърде неясна за разпознаване. Моля, направете по-ясна снимка при добро осветление.',
    canRetry: true,
    showSupport: false,
  }),

  noTextFound: (): AppError => ({
    type: 'ocr',
    title: 'Не е открит текст',
    message: 'Не успяхме да открием текст в снимката. Моля, уверете се, че касовата бележка е ясно видима.',
    canRetry: true,
    showSupport: true,
  }),

  receiptNotFound: (): AppError => ({
    type: 'database',
    title: 'Касовата бележка не е намерена',
    message: 'Търсената касова бележка не съществува или е била изтрита.',
    canRetry: false,
    showSupport: true,
  }),

  duplicateReceipt: (): AppError => ({
    type: 'validation',
    title: 'Дублирана бележка',
    message: 'Тази касова бележка може би вече е добавена. Проверете списъка с касови бележки.',
    canRetry: false,
    showSupport: false,
  }),
};

/**
 * Log error for debugging and send to Sentry in production
 */
export function logError(error: AppError, originalError?: any) {
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔴 ${error.type.toUpperCase()} ERROR: ${error.title}`);
    console.log('User Message:', error.message);
    if (error.technicalMessage) {
      console.log('Technical:', error.technicalMessage);
    }
    if (originalError) {
      console.log('Original Error:', originalError);
    }
    console.groupEnd();
  }

  // Production error tracking with Sentry
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    import('@sentry/nextjs').then(({ captureException, setContext }) => {
      // Set custom context for the error
      setContext('app_error', {
        type: error.type,
        title: error.title,
        userMessage: error.message,
        technicalMessage: error.technicalMessage,
        canRetry: error.canRetry,
        showSupport: error.showSupport,
      });

      // Capture the error to Sentry
      captureException(originalError || new Error(error.title), {
        level: error.type === 'unknown' ? 'error' : 'warning',
        tags: {
          error_type: error.type,
          can_retry: error.canRetry.toString(),
        },
      });
    });
  }
}

/**
 * Get support contact info
 */
export function getSupportContact() {
  return {
    email: 'support@prizma.bg',
    phone: '+359 888 123 456',
    hours: 'Пон-Пет: 9:00-18:00',
  };
}

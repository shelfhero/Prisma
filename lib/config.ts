/**
 * Application Configuration for Призма Receipt App
 * Central configuration and constants
 */

import { getEnvConfig } from './env-validation';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // URLs
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },


  // File uploads
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFilesPerUpload: 5,
  },

  // Rate limiting
  rateLimit: {
    apiRequests: { limit: 100, window: 60000 }, // 100 requests per minute
    uploads: { limit: 10, window: 60000 }, // 10 uploads per minute
    auth: { limit: 5, window: 300000 }, // 5 auth attempts per 5 minutes
  },

  // Features
  features: {
    enableAnalytics: true,
    enableNotifications: true,
    enableExports: true,
    enableBulkOperations: true,
  },
};

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

export const APP_CONSTANTS = {
  // Supported currencies
  CURRENCIES: ['BGN', 'EUR', 'USD'] as const,

  // Default values
  DEFAULT_CURRENCY: 'BGN',
  DEFAULT_LANGUAGE: 'bg',
  DEFAULT_TIMEZONE: 'Europe/Sofia',

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File upload
  RECEIPT_IMAGE_BUCKET: 'receipt-images',
  AVATAR_BUCKET: 'avatars',

  // Receipt processing
  RECEIPT_RETENTION_DAYS: 365 * 7, // 7 years
  AUTO_DELETE_FAILED_UPLOADS: 24 * 60 * 60 * 1000, // 24 hours

  // Categories
  DEFAULT_CATEGORIES: [
    'Хранителни продукти',
    'Напитки',
    'Козметика и хигиена',
    'Битова химия',
    'Облекло',
    'Електроника',
    'Книги и медии',
    'Спорт и свободно време',
    'Здраве и медицина',
    'Транспорт',
    'Услуги',
    'Други'
  ],

  // User roles
  USER_ROLES: ['user', 'admin'] as const,

  // Receipt statuses
  RECEIPT_STATUSES: ['pending', 'processing', 'completed', 'failed'] as const,

  // Export formats
  EXPORT_FORMATS: ['csv', 'xlsx', 'pdf', 'json'] as const,
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  // User profile
  user: {
    fullName: { minLength: 2, maxLength: 100 },
    phone: { pattern: /^\+?[1-9]\d{1,14}$/ },
  },

  // Receipt
  receipt: {
    totalAmount: { min: 0, max: 999999.99 },
    notes: { maxLength: 1000 },
    tags: { maxCount: 10, maxLength: 50 },
  },

  // Item
  item: {
    productName: { minLength: 1, maxLength: 200 },
    qty: { min: 0.001, max: 9999 },
    unitPrice: { min: 0, max: 99999.99 },
  },

  // Retailer
  retailer: {
    name: { minLength: 2, maxLength: 100 },
    phone: { pattern: /^\+?[1-9]\d{1,14}$/ },
    taxId: { pattern: /^[0-9]{9,13}$/ },
  },

  // Category
  category: {
    name: { minLength: 2, maxLength: 50 },
    description: { maxLength: 500 },
  },
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
  // Breakpoints (matching Tailwind)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1010,
    fixed: 1020,
    modalBackdrop: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },

  // Animation durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Colors (Bulgarian theme)
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      900: '#78350f',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      900: '#7f1d1d',
    },
  },
} as const;

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    resetPassword: '/api/auth/reset-password',
    profile: '/api/auth/profile',
  },

  // Receipts
  receipts: {
    list: '/api/receipts',
    create: '/api/receipts',
    process: '/api/receipts/process',
    get: (id: string) => `/api/receipts/${id}`,
    update: (id: string) => `/api/receipts/${id}`,
    delete: (id: string) => `/api/receipts/${id}`,
    export: '/api/receipts/export',
    analytics: '/api/receipts/analytics',
  },

  // Items
  items: {
    list: '/api/items',
    get: (id: string) => `/api/items/${id}`,
    update: (id: string) => `/api/items/${id}`,
    delete: (id: string) => `/api/items/${id}`,
    analytics: (id: string) => `/api/items/${id}/analytics`,
  },

  // Categories
  categories: {
    list: '/api/categories',
    create: '/api/categories',
    get: (id: string) => `/api/categories/${id}`,
    update: (id: string) => `/api/categories/${id}`,
    delete: (id: string) => `/api/categories/${id}`,
  },

  // Retailers
  retailers: {
    list: '/api/retailers',
    create: '/api/retailers',
    get: (id: string) => `/api/retailers/${id}`,
    update: (id: string) => `/api/retailers/${id}`,
    delete: (id: string) => `/api/retailers/${id}`,
  },

  // Analytics
  analytics: {
    dashboard: '/api/analytics/dashboard',
    spending: '/api/analytics/spending',
    categories: '/api/analytics/categories',
    retailers: '/api/analytics/retailers',
    trends: '/api/analytics/trends',
  },

  // System
  system: {
    health: '/api/health',
    version: '/api/version',
  },
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Database
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',

  // Files
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',


  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  // UI Features
  ENABLE_DARK_MODE: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_ADVANCED_SEARCH: true,
  ENABLE_EXPORT_FEATURES: true,

  // Analytics
  ENABLE_ANALYTICS: true,
  ENABLE_PRICE_TRACKING: true,
  ENABLE_SPENDING_REPORTS: true,

  ENABLE_NOTIFICATIONS: true,

  // Admin features
  ENABLE_ADMIN_PANEL: config.isDevelopment,
  ENABLE_DEBUG_MODE: config.isDevelopment,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get configuration with environment validation
 */
export function getConfig() {
  if (typeof window !== 'undefined') {
    // Client-side: only return public config
    return {
      env: config.env,
      isDevelopment: config.isDevelopment,
      isProduction: config.isProduction,
      appUrl: config.appUrl,
      supabase: {
        url: config.supabase.url,
        anonKey: config.supabase.anonKey,
      },
      upload: config.upload,
      features: config.features,
    };
  }

  // Server-side: return full config
  return config;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Get API endpoint URL
 */
export function getApiUrl(endpoint: string): string {
  return `${config.appUrl}${endpoint}`;
}

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
  try {
    getEnvConfig();
    console.log('✅ Configuration validated successfully');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    throw error;
  }
}

// Validate config on module load
if (config.isProduction) {
  validateConfig();
}
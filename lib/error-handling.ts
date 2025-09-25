/**
 * Error Handling and Security Utilities for Призма Receipt App
 * Provides comprehensive error handling, logging, and security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ValidationError } from '@/types';

// ============================================================================
// ERROR TYPES AND CLASSES
// ============================================================================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',

  // File Upload
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);

    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[], details?: any) {
    const message = `Validation failed: ${errors.map(e => e.message).join(', ')}`;
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Неоторизиран достъп', details?: any) {
    super(message, ErrorCode.UNAUTHORIZED, 401, true, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Няма достатъчно права', details?: any) {
    super(message, ErrorCode.FORBIDDEN, 403, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'ресурс', details?: any) {
    super(`${resource} не е намерен`, ErrorCode.RECORD_NOT_FOUND, 404, true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(resetTime?: number, details?: any) {
    super(
      'Твърде много заявки. Опитайте отново по-късно',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      true,
      { resetTime, ...details }
    );
  }
}

// ============================================================================
// ERROR MESSAGES IN BULGARIAN
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 'Неоторизиран достъп',
  [ErrorCode.FORBIDDEN]: 'Няма достатъчно права',
  [ErrorCode.TOKEN_EXPIRED]: 'Сесията е изтекла',
  [ErrorCode.INVALID_CREDENTIALS]: 'Невалидни данни за влизане',

  // Validation
  [ErrorCode.VALIDATION_ERROR]: 'Грешка в данните',
  [ErrorCode.INVALID_INPUT]: 'Невалидни входни данни',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Липсва задължително поле',

  // Database
  [ErrorCode.DATABASE_ERROR]: 'Грешка в базата данни',
  [ErrorCode.RECORD_NOT_FOUND]: 'Записът не е намерен',
  [ErrorCode.DUPLICATE_RECORD]: 'Записът вече съществува',
  [ErrorCode.FOREIGN_KEY_VIOLATION]: 'Свързан запис не съществува',

  // File Upload
  [ErrorCode.FILE_TOO_LARGE]: 'Файлът е твърде голям',
  [ErrorCode.INVALID_FILE_TYPE]: 'Невалиден тип файл',
  [ErrorCode.UPLOAD_FAILED]: 'Качването на файла е неуспешно',

  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Грешка във външна услуга',

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Твърде много заявки',

  // System
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Вътрешна грешка на сървъра',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Услугата не е достъпна',
  [ErrorCode.CONFIGURATION_ERROR]: 'Грешка в конфигурацията',
};

// ============================================================================
// ERROR HANDLER FUNCTIONS
// ============================================================================

/**
 * Central error handler for API routes
 */
export function handleApiError(error: unknown, operation: string = 'Unknown operation'): ApiResponse {
  console.error(`[API Error] ${operation}:`, error);

  // Handle known AppError instances
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        stack: error.stack,
        details: error.details,
        timestamp: error.timestamp
      } : undefined
    };
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any;
    const userMessage = mapSupabaseError(supabaseError);

    return {
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? supabaseError : undefined
    };
  }

  // Handle validation errors
  if (error instanceof Error && error.message.includes('validation')) {
    return {
      success: false,
      error: ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR],
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'Неизвестна грешка';

  return {
    success: false,
    error: ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
    details: process.env.NODE_ENV === 'development' ? {
      originalMessage: message,
      stack: error instanceof Error ? error.stack : undefined
    } : undefined
  };
}

/**
 * Create API error response
 */
export function createErrorResponse(
  error: AppError | Error | unknown,
  statusCode?: number
): NextResponse<ApiResponse> {
  const apiResponse = handleApiError(error);

  let status = statusCode;

  if (error instanceof AppError) {
    status = error.statusCode;
  } else if (!status) {
    status = 500;
  }

  return NextResponse.json(apiResponse, { status });
}

/**
 * Map Supabase errors to user-friendly messages
 */
function mapSupabaseError(error: any): string {
  const errorCode = error?.code || error?.error_code;
  const errorMessage = error?.message || '';

  // PostgreSQL error codes
  const postgresErrorMap: Record<string, string> = {
    '23505': ERROR_MESSAGES[ErrorCode.DUPLICATE_RECORD],
    '23503': ERROR_MESSAGES[ErrorCode.FOREIGN_KEY_VIOLATION],
    '42501': ERROR_MESSAGES[ErrorCode.FORBIDDEN],
  };

  // Supabase PostgREST error codes
  const postgrestErrorMap: Record<string, string> = {
    'PGRST301': ERROR_MESSAGES[ErrorCode.RECORD_NOT_FOUND],
    'PGRST204': 'Няма данни за показване',
    'PGRST116': ERROR_MESSAGES[ErrorCode.FORBIDDEN],
  };

  // Auth errors
  if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_grant')) {
    return ERROR_MESSAGES[ErrorCode.INVALID_CREDENTIALS];
  }

  if (errorMessage.includes('Email not confirmed')) {
    return 'Имейлът не е потвърден';
  }

  if (errorMessage.includes('Token has expired')) {
    return ERROR_MESSAGES[ErrorCode.TOKEN_EXPIRED];
  }

  // Check mapped errors
  if (errorCode && postgresErrorMap[errorCode]) {
    return postgresErrorMap[errorCode];
  }

  if (errorCode && postgrestErrorMap[errorCode]) {
    return postgrestErrorMap[errorCode];
  }

  // Default to generic database error
  return ERROR_MESSAGES[ErrorCode.DATABASE_ERROR];
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    const value = data[field];

    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `Полето "${field}" е задължително`,
        code: 'REQUIRED'
      });
    }
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Невалиден имейл адрес',
      code: 'INVALID_EMAIL'
    };
  }

  return null;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

  // Check file size
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `Файлът е твърде голям (максимум ${Math.round(maxSize / 1024 / 1024)}MB)`,
      code: 'FILE_TOO_LARGE'
    });
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `Невалиден тип файл. Разрешени типове: ${allowedTypes.join(', ')}`,
      code: 'INVALID_FILE_TYPE'
    });
  }

  return errors;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Validate and sanitize receipt data
 */
export function validateReceiptData(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  const requiredFields = ['totalAmount', 'currency', 'purchasedAt'];
  errors.push(...validateRequiredFields(data, requiredFields));

  // Validate total amount
  if (data.totalAmount !== undefined) {
    const amount = Number(data.totalAmount);
    if (isNaN(amount) || amount < 0) {
      errors.push({
        field: 'totalAmount',
        message: 'Сумата трябва да е положително число',
        code: 'INVALID_AMOUNT'
      });
    }
  }

  // Validate currency
  if (data.currency && !['BGN', 'EUR', 'USD'].includes(data.currency)) {
    errors.push({
      field: 'currency',
      message: 'Невалидна валута',
      code: 'INVALID_CURRENCY'
    });
  }

  // Validate date
  if (data.purchasedAt) {
    const date = new Date(data.purchasedAt);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'purchasedAt',
        message: 'Невалидна дата',
        code: 'INVALID_DATE'
      });
    }
  }

  // Validate items if present
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item: any, index: number) => {
      if (!item.productName) {
        errors.push({
          field: `items[${index}].productName`,
          message: 'Името на продукта е задължително',
          code: 'REQUIRED'
        });
      }

      if (item.qty !== undefined) {
        const qty = Number(item.qty);
        if (isNaN(qty) || qty <= 0) {
          errors.push({
            field: `items[${index}].qty`,
            message: 'Количеството трябва да е положително число',
            code: 'INVALID_QUANTITY'
          });
        }
      }

      if (item.unitPrice !== undefined) {
        const price = Number(item.unitPrice);
        if (isNaN(price) || price < 0) {
          errors.push({
            field: `items[${index}].unitPrice`,
            message: 'Цената трябва да е положително число',
            code: 'INVALID_PRICE'
          });
        }
      }
    });
  }

  return errors;
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Rate limiting store (in production, use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  record.count++;

  return {
    allowed: true,
    remaining: limit - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Extract client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  if (xRealIp) {
    return xRealIp;
  }

  return request.ip || '127.0.0.1';
}

/**
 * Create rate limit key for user/IP
 */
export function createRateLimitKey(request: NextRequest, userId?: string): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  if (userId) {
    return `user:${userId}`;
  }

  // Use IP + hashed user agent for anonymous users
  const agentHash = Buffer.from(userAgent).toString('base64').substring(0, 8);
  return `ip:${ip}:${agentHash}`;
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  request: NextRequest,
  userId?: string,
  details?: any
): void {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  console.warn(`[Security Event] ${event}`, {
    ip,
    userAgent,
    userId,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    details
  });

  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with security monitoring service
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[Error] ${operation}:`, error);
      throw error;
    }
  }) as T;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Check if error is operational (safe to expose to user)
 */
export function isOperationalError(error: unknown): boolean {
  return error instanceof AppError && error.isOperational;
}

/**
 * Clean up sensitive data from error details
 */
export function sanitizeErrorDetails(details: any): any {
  if (!details || typeof details !== 'object') {
    return details;
  }

  const sanitized = { ...details };

  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth',
    'authorization', 'cookie', 'session'
  ];

  function cleanObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));

        if (isSensitive) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = cleanObject(value);
        }
      }

      return cleaned;
    }

    return obj;
  }

  return cleanObject(sanitized);
}
/**
 * Form Validation for Призма
 * Bulgarian validation messages and form validation utilities
 */

import { isValidEmail, validatePassword } from './utils';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const VALIDATION_MESSAGES = {
  required: (field: string) => `${field} е задължително поле`,
  email: 'Въведете валиден имейл адрес',
  minLength: (field: string, min: number) => `${field} трябва да е поне ${min} символа`,
  maxLength: (field: string, max: number) => `${field} не може да е повече от ${max} символа`,
  passwordWeak: 'Паролата е твърде слаба',
  passwordMismatch: 'Паролите не съвпадат',
  invalidFormat: (field: string) => `${field} има невалиден формат`,
};

export const FIELD_LABELS = {
  email: 'Имейл',
  password: 'Парола',
  confirmPassword: 'Потвърдете паролата',
  fullName: 'Пълно име',
  firstName: 'Име',
  lastName: 'Фамилия',
  phone: 'Телефон',
  company: 'Фирма',
};

/**
 * Validate a single field
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldName: string
): string | null {
  const label = FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName;

  // Required validation
  if (rules.required && (!value || value.toString().trim() === '')) {
    return VALIDATION_MESSAGES.required(label);
  }

  // Skip other validations if field is empty and not required
  if (!value || value.toString().trim() === '') {
    return null;
  }

  const stringValue = value.toString();

  // Min length validation
  if (rules.minLength && stringValue.length < rules.minLength) {
    return VALIDATION_MESSAGES.minLength(label, rules.minLength);
  }

  // Max length validation
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return VALIDATION_MESSAGES.maxLength(label, rules.maxLength);
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return VALIDATION_MESSAGES.invalidFormat(label);
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

/**
 * Validate multiple fields
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules, field);
    if (error) {
      errors.push({ field, message: error });
    }
  }

  return errors;
}

/**
 * Auth form validation rules
 */
export const AUTH_VALIDATION_RULES = {
  login: {
    email: {
      required: true,
      custom: (value: string) => {
        if (!isValidEmail(value)) {
          return VALIDATION_MESSAGES.email;
        }
        return null;
      }
    },
    password: {
      required: true,
      minLength: 6
    }
  },

  register: {
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    email: {
      required: true,
      custom: (value: string) => {
        if (!isValidEmail(value)) {
          return VALIDATION_MESSAGES.email;
        }
        return null;
      }
    },
    password: {
      required: true,
      custom: (value: string) => {
        const validation = validatePassword(value);
        if (!validation.isValid) {
          return validation.errors[0]; // Return first error
        }
        return null;
      }
    },
    confirmPassword: {
      required: true,
      custom: (value: string, formData?: any) => {
        if (formData && value !== formData.password) {
          return VALIDATION_MESSAGES.passwordMismatch;
        }
        return null;
      }
    }
  },

  resetPassword: {
    email: {
      required: true,
      custom: (value: string) => {
        if (!isValidEmail(value)) {
          return VALIDATION_MESSAGES.email;
        }
        return null;
      }
    }
  }
};

/**
 * Validate login form
 */
export function validateLoginForm(data: { email: string; password: string }): ValidationError[] {
  return validateForm(data, AUTH_VALIDATION_RULES.login);
}

/**
 * Validate register form
 */
export function validateRegisterForm(data: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationError[] {
  const errors = validateForm(data, AUTH_VALIDATION_RULES.register);

  // Special handling for confirm password
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    const existingError = errors.find(e => e.field === 'confirmPassword');
    if (!existingError) {
      errors.push({
        field: 'confirmPassword',
        message: VALIDATION_MESSAGES.passwordMismatch
      });
    }
  }

  return errors;
}

/**
 * Validate reset password form
 */
export function validateResetPasswordForm(data: { email: string }): ValidationError[] {
  return validateForm(data, AUTH_VALIDATION_RULES.resetPassword);
}

/**
 * Get field error from validation errors array
 */
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find(error => error.field === field)?.message;
}

/**
 * Check if form has any errors
 */
export function hasFormErrors(errors: ValidationError[]): boolean {
  return errors.length > 0;
}
/**
 * Environment Variable Validation Utility
 * Provides comprehensive validation and error handling for environment variables
 */

export interface EnvValidationResult {
  valid: boolean;
  missingVars: string[];
  invalidVars: string[];
  warnings: string[];
}

export interface EnvConfig {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;


  // Application Configuration
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

// Bulgarian error messages for consistent UX
export const ENV_ERRORS = {
  MISSING_REQUIRED: 'Липсват задължителни променливи в конфигурацията',
  INVALID_FORMAT: 'Невалиден формат на променлива',
  SUPABASE_URL_INVALID: 'NEXT_PUBLIC_SUPABASE_URL трябва да започва с https://',
  API_KEY_PLACEHOLDER: 'API ключът изглежда като placeholder стойност',
  CONFIG_NOT_LOADED: 'Конфигурацията не е заредена правилно',
  DEVELOPMENT_ONLY: 'Тази функция работи само в development режим'
} as const;

export const ENV_WARNINGS = {
  OPTIONAL_MISSING: 'Липсва незадължителна променлива',
  DEVELOPMENT_MODE: 'Приложението работи в development режим',
  PLACEHOLDER_DETECTED: 'Открита placeholder стойност'
} as const;

/**
 * Validates all required environment variables
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const optionalVars = [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL'
  ];

  const missingVars: string[] = [];
  const invalidVars: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      missingVars.push(varName);
      continue;
    }

    // Check for placeholder values
    if (isPlaceholderValue(value)) {
      invalidVars.push(varName);
      warnings.push(`${varName}: ${ENV_WARNINGS.PLACEHOLDER_DETECTED}`);
      continue;
    }

    // Specific validation rules
    const validation = validateSpecificVar(varName, value);
    if (!validation.valid) {
      invalidVars.push(varName);
      warnings.push(`${varName}: ${validation.error}`);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      warnings.push(`${varName}: ${ENV_WARNINGS.OPTIONAL_MISSING}`);
    } else if (isPlaceholderValue(value)) {
      warnings.push(`${varName}: ${ENV_WARNINGS.PLACEHOLDER_DETECTED}`);
    }
  }

  return {
    valid: missingVars.length === 0 && invalidVars.length === 0,
    missingVars,
    invalidVars,
    warnings
  };
}

/**
 * Checks if a value appears to be a placeholder
 */
function isPlaceholderValue(value: string): boolean {
  const placeholderPatterns = [
    'your-project-ref',
    'example',
    'placeholder',
    'replace-with',
    'your-key-here',
    'https://your-project-ref.supabase.co'
  ];

  const lowerValue = value.toLowerCase();
  return placeholderPatterns.some(pattern => lowerValue.includes(pattern));
}

/**
 * Validates specific environment variables with custom rules
 */
function validateSpecificVar(varName: string, value: string): { valid: boolean; error?: string } {
  switch (varName) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      if (!value.startsWith('https://')) {
        return { valid: false, error: ENV_ERRORS.SUPABASE_URL_INVALID };
      }
      if (!value.includes('.supabase.co')) {
        return { valid: false, error: 'URL трябва да е валиден Supabase URL' };
      }
      break;


    case 'SUPABASE_SERVICE_ROLE_KEY':
      if (!value.startsWith('eyJ')) {
        return { valid: false, error: 'Service role ключът трябва да е JWT токен' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Gets environment configuration with type safety
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnvironmentVariables();

  if (!validation.valid) {
    throw new Error(`${ENV_ERRORS.CONFIG_NOT_LOADED}: ${validation.missingVars.join(', ')}`);
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  };
}

/**
 * Validates environment on server startup and logs results
 */
export function validateAndLogEnvironment(): void {
  const validation = validateEnvironmentVariables();

  if (validation.valid) {
    console.log('✅ Всички задължителни променливи са конфигурирани');

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Предупреждения:');
      validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }
  } else {
    console.error('❌ КРИТИЧНА ГРЕШКА: Липсват задължителни променливи!');

    if (validation.missingVars.length > 0) {
      console.error('📋 Липсват променливи:');
      validation.missingVars.forEach(varName => console.error(`  • ${varName}`));
    }

    if (validation.invalidVars.length > 0) {
      console.error('⚠️ Невалидни променливи:');
      validation.invalidVars.forEach(varName => console.error(`  • ${varName}`));
    }

    console.error('🔧 Проверете .env.local файла и актуализирайте конфигурацията');

    if (process.env.NODE_ENV === 'production') {
      throw new Error(ENV_ERRORS.MISSING_REQUIRED);
    }
  }
}

/**
 * Development helper to display current environment status
 */
export function displayEnvironmentStatus(): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn(ENV_ERRORS.DEVELOPMENT_ONLY);
    return;
  }

  console.log('\n🔧 Environment Configuration Status');
  console.log('=' .repeat(50));

  const validation = validateEnvironmentVariables();

  // Required variables status
  console.log('\n📋 Required Variables:');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value && !isPlaceholderValue(value) ? '✅' : '❌';
    const displayValue = value ? maskSensitiveValue(varName, value) : 'NOT SET';
    console.log(`  ${status} ${varName}: ${displayValue}`);
  });

  // Optional variables status
  console.log('\n📋 Optional Variables:');
  const optionalVars = [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL'
  ];

  optionalVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '⚠️';
    const displayValue = value ? maskSensitiveValue(varName, value) : 'NOT SET';
    console.log(`  ${status} ${varName}: ${displayValue}`);
  });

  // Overall status
  console.log(`\n🎯 Overall Status: ${validation.valid ? '✅ READY' : '❌ NEEDS CONFIGURATION'}`);

  if (validation.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    validation.warnings.forEach(warning => console.log(`  • ${warning}`));
  }
}

/**
 * Masks sensitive values for safe logging
 */
function maskSensitiveValue(varName: string, value: string): string {
  if (varName.includes('KEY') || varName.includes('SECRET')) {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
  }

  if (varName.includes('URL')) {
    return value;
  }

  return value.length > 20 ? value.slice(0, 20) + '...' : value;
}

/**
 * Runtime environment check for API routes
 */
export function requireValidEnvironment(): void {
  const validation = validateEnvironmentVariables();

  if (!validation.valid) {
    const missingVars = [...validation.missingVars, ...validation.invalidVars];
    throw new Error(`${ENV_ERRORS.CONFIG_NOT_LOADED}: ${missingVars.join(', ')}`);
  }
}
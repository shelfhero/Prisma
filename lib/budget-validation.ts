/**
 * Budget Validation Utilities
 * Validates budget data and returns user-friendly Bulgarian errors
 */

import { BudgetErrors, AppError } from './error-handler';

export interface BudgetValidationResult {
  isValid: boolean;
  errors: AppError[];
  warnings: AppError[];
}

export interface CategoryAllocation {
  category_id: string;
  category_name: string;
  limit_amount: number;
}

const MAX_BUDGET_AMOUNT = 1000000; // 1 million BGN

/**
 * Validate total budget amount
 */
export function validateBudgetAmount(amount: number): BudgetValidationResult {
  const errors: AppError[] = [];
  const warnings: AppError[] = [];

  // Check if negative
  if (amount < 0) {
    errors.push(BudgetErrors.negativeBudget());
  }

  // Check if zero
  if (amount === 0) {
    errors.push(BudgetErrors.zeroBudget());
  }

  // Check if too large
  if (amount > MAX_BUDGET_AMOUNT) {
    errors.push(BudgetErrors.budgetTooLarge(MAX_BUDGET_AMOUNT));
  }

  // Warning if very low
  if (amount > 0 && amount < 50) {
    warnings.push({
      type: 'validation',
      title: 'Много нисък бюджет',
      message: 'Бюджетът ви е доста нисък. Уверете се, че сте въвели правилната сума.',
      canRetry: false,
      showSupport: false,
    });
  }

  // Warning if very high
  if (amount > 50000) {
    warnings.push({
      type: 'validation',
      title: 'Много висок бюджет',
      message: 'Бюджетът ви е доста висок. Уверете се, че сте въвели правилната сума.',
      canRetry: false,
      showSupport: false,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate category allocations
 */
export function validateCategoryAllocations(
  totalBudget: number,
  allocations: CategoryAllocation[]
): BudgetValidationResult {
  const errors: AppError[] = [];
  const warnings: AppError[] = [];

  // Check if any allocations exist
  if (allocations.length === 0) {
    errors.push({
      type: 'validation',
      title: 'Няма категории',
      message: 'Трябва да добавите поне една категория към бюджета.',
      canRetry: false,
      showSupport: false,
    });
    return { isValid: false, errors, warnings };
  }

  // Check for negative amounts
  allocations.forEach(allocation => {
    if (allocation.limit_amount < 0) {
      errors.push({
        type: 'validation',
        title: 'Невалидна сума',
        message: `Сумата за "${allocation.category_name}" не може да бъде отрицателна.`,
        canRetry: false,
        showSupport: false,
      });
    }
  });

  // Calculate total allocated
  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + allocation.limit_amount,
    0
  );

  // Check if total matches budget (with small tolerance for rounding)
  const tolerance = 0.01;
  const difference = Math.abs(totalBudget - totalAllocated);

  if (difference > tolerance) {
    errors.push(
      BudgetErrors.totalMismatch(totalBudget, totalAllocated)
    );
  }

  // Warning if a category has 0 allocation
  allocations.forEach(allocation => {
    if (allocation.limit_amount === 0) {
      warnings.push({
        type: 'validation',
        title: 'Нулева сума',
        message: `Категорията "${allocation.category_name}" има нулева сума. Сигурни ли сте?`,
        canRetry: false,
        showSupport: false,
      });
    }
  });

  // Warning if one category takes more than 80% of budget
  allocations.forEach(allocation => {
    const percentage = (allocation.limit_amount / totalBudget) * 100;
    if (percentage > 80) {
      warnings.push({
        type: 'validation',
        title: 'Неравномерно разпределение',
        message: `Категорията "${allocation.category_name}" заема ${percentage.toFixed(0)}% от бюджета. Сигурни ли сте в разпределението?`,
        canRetry: false,
        showSupport: false,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete budget setup
 */
export function validateBudgetSetup(
  totalBudget: number,
  allocations: CategoryAllocation[]
): BudgetValidationResult {
  const budgetResult = validateBudgetAmount(totalBudget);
  const allocationsResult = validateCategoryAllocations(totalBudget, allocations);

  return {
    isValid: budgetResult.isValid && allocationsResult.isValid,
    errors: [...budgetResult.errors, ...allocationsResult.errors],
    warnings: [...budgetResult.warnings, ...allocationsResult.warnings],
  };
}

/**
 * Check if category spending is over budget
 */
export function checkCategoryOverBudget(
  categoryName: string,
  spent: number,
  limit: number
): AppError | null {
  if (spent > limit) {
    return BudgetErrors.categoryOverBudget(categoryName, spent, limit);
  }
  return null;
}

/**
 * Check if total spending is over budget
 */
export function checkTotalOverBudget(
  spent: number,
  limit: number
): AppError | null {
  if (spent > limit) {
    return BudgetErrors.totalOverBudget(spent, limit);
  }
  return null;
}

/**
 * Get budget status with warnings
 */
export function getBudgetStatus(
  spent: number,
  limit: number,
  categoryName?: string
): {
  status: 'safe' | 'warning' | 'danger' | 'over';
  percentage: number;
  message: string;
  error?: AppError;
} {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  if (percentage > 100) {
    return {
      status: 'over',
      percentage,
      message: categoryName
        ? `Надвишихте бюджета за ${categoryName}`
        : 'Надвишихте бюджета',
      error: categoryName
        ? BudgetErrors.categoryOverBudget(categoryName, spent, limit)
        : BudgetErrors.totalOverBudget(spent, limit),
    };
  }

  if (percentage > 90) {
    return {
      status: 'danger',
      percentage,
      message: 'Много близо до лимита! Внимавайте с разходите.',
    };
  }

  if (percentage > 75) {
    return {
      status: 'warning',
      percentage,
      message: 'Приближавате към лимита. Следете разходите си.',
    };
  }

  return {
    status: 'safe',
    percentage,
    message: 'Спазвате бюджета си. Продължавайте така!',
  };
}

/**
 * Format currency for Bulgarian locale
 */
export function formatBGN(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

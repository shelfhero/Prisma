'use client';

/**
 * Optimistic UI Updates Hook
 * Update UI immediately, rollback on error
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
  error: Error | null;
}

export function useOptimisticUpdate<T>(initialData: T) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    error: null,
  });

  /**
   * Perform optimistic update
   * Updates UI immediately, then performs actual operation
   * Rolls back on error
   */
  const performUpdate = useCallback(
    async (
      optimisticData: T,
      operation: () => Promise<T>,
      options?: {
        successMessage?: string;
        errorMessage?: string;
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
      }
    ) => {
      // Save current state for rollback
      const previousData = state.data;

      // Apply optimistic update immediately
      setState({
        data: optimisticData,
        isOptimistic: true,
        error: null,
      });

      try {
        // Perform actual operation
        const result = await operation();

        // Update with actual data
        setState({
          data: result,
          isOptimistic: false,
          error: null,
        });

        // Show success message
        if (options?.successMessage) {
          toast.success(options.successMessage);
        }

        // Call success callback
        options?.onSuccess?.(result);

        return result;
      } catch (error: any) {
        console.error('Optimistic update failed:', error);

        // Rollback to previous state
        setState({
          data: previousData,
          isOptimistic: false,
          error,
        });

        // Show error message
        if (options?.errorMessage) {
          toast.error(options.errorMessage);
        } else {
          toast.error('Операцията не успя', {
            description: 'Опитайте отново или презаредете страницата',
          });
        }

        // Call error callback
        options?.onError?.(error);

        throw error;
      }
    },
    [state.data]
  );

  /**
   * Update data without optimistic behavior
   */
  const setData = useCallback((data: T) => {
    setState({
      data,
      isOptimistic: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    performUpdate,
    setData,
  };
}

/**
 * Optimistic list operations
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialList: T[]
) {
  const {
    data: list,
    isOptimistic,
    error,
    performUpdate,
    setData,
  } = useOptimisticUpdate<T[]>(initialList);

  /**
   * Add item optimistically
   */
  const addItem = useCallback(
    async (
      item: T,
      operation: () => Promise<T>,
      options?: { successMessage?: string }
    ) => {
      return performUpdate(
        [...list, item], // Add to end immediately
        async () => {
          const newItem = await operation();
          // Replace optimistic item with real one
          return [...list, newItem];
        },
        {
          successMessage: options?.successMessage || 'Добавено успешно',
          errorMessage: 'Грешка при добавяне',
        }
      );
    },
    [list, performUpdate]
  );

  /**
   * Update item optimistically
   */
  const updateItem = useCallback(
    async (
      id: string | number,
      updates: Partial<T>,
      operation: () => Promise<T>,
      options?: { successMessage?: string }
    ) => {
      return performUpdate(
        list.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
        async () => {
          const updated = await operation();
          return list.map(item => (item.id === id ? updated : item));
        },
        {
          successMessage: options?.successMessage || 'Обновено успешно',
          errorMessage: 'Грешка при обновяване',
        }
      );
    },
    [list, performUpdate]
  );

  /**
   * Delete item optimistically
   */
  const deleteItem = useCallback(
    async (
      id: string | number,
      operation: () => Promise<void>,
      options?: { successMessage?: string }
    ) => {
      const item = list.find(i => i.id === id);

      return performUpdate(
        list.filter(item => item.id !== id), // Remove immediately
        async () => {
          await operation();
          return list.filter(item => item.id !== id);
        },
        {
          successMessage: options?.successMessage || 'Изтрито успешно',
          errorMessage: 'Грешка при изтриване',
        }
      );
    },
    [list, performUpdate]
  );

  return {
    list,
    isOptimistic,
    error,
    addItem,
    updateItem,
    deleteItem,
    setList: setData,
  };
}

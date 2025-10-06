'use client';

/**
 * Pagination Hook
 * Handle paginated data with loading states
 */

import { useState, useCallback, useEffect } from 'react';

export interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
  totalCount?: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

export function usePagination(options: PaginationOptions = {}) {
  const {
    initialPage = 1,
    pageSize = 20,
    totalCount = 0,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage] = useState(pageSize);
  const [total, setTotal] = useState(totalCount);

  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, total);

  const state: PaginationState = {
    currentPage,
    pageSize: itemsPerPage,
    totalPages,
    totalCount: total,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    startIndex,
    endIndex,
  };

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (state.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [state.hasNextPage]);

  const prevPage = useCallback(() => {
    if (state.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [state.hasPrevPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  return {
    ...state,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    setTotalCount: setTotal,
  };
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll<T>(
  fetchMore: (page: number) => Promise<{ items: T[]; hasMore: boolean }>,
  options: { pageSize?: number } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchMore(page);
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err: any) {
      setError(err);
      console.error('Error loading more items:', err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
  };
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, callback, options]);

  return setElement;
}

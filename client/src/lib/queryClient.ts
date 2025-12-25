import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client configuration for Metal-Flow-ERP
 *
 * Default options optimized for ERP system:
 * - 5 minute stale time (data doesn't change frequently)
 * - Single retry on failure
 * - No refetch on window focus (prevents unnecessary API calls during data entry)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import api from '@src/lib/api/axios';
import { extractApiError } from '@src/lib/api/extractError';

type CrudMethod = 'post' | 'put' | 'patch' | 'delete';

interface CrudMutationConfig<TInput> {
  method: CrudMethod;
  endpoint: string | ((data: TInput) => string);
  navigateTo: string;
}

interface CrudMutationReturn<TInput> {
  mutate: (data: TInput) => Promise<string | null>;
  isPending: boolean;
}

/**
 * Generic CRUD mutation hook.
 *
 * @param config.method - HTTP method (post, put, patch, delete)
 * @param config.endpoint - Static string or function that derives the URL from input data
 * @param config.navigateTo - Route to navigate to after successful mutation
 * @returns { mutate, isPending } – mutate returns null on success, error string on failure
 */
export function useCrudMutation<TInput>(config: CrudMutationConfig<TInput>): CrudMutationReturn<TInput> {
  const { method, endpoint, navigateTo } = config;
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (data: TInput): Promise<string | null> => {
      setIsPending(true);
      try {
        const url = typeof endpoint === 'function' ? endpoint(data) : endpoint;

        await api[method]<unknown>(url, data);
        navigate(navigateTo);
        return null;
      } catch (e: unknown) {
        return extractApiError(e);
      } finally {
        setIsPending(false);
      }
    },
    [endpoint, method, navigateTo, navigate],
  );

  return { mutate, isPending };
}

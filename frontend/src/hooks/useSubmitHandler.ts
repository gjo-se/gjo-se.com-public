import axios from 'axios';
import { useCallback, useState } from 'react';

interface UseSubmitHandlerOptions {
  /** Runs BEFORE the async call. Return error string or null. */
  validate?: () => string | null | Promise<string | null>;
  /** Runs on success (after setLoading(false)). */
  onSuccess?: () => void | Promise<void>;
  /** Custom fallback error message. */
  errorMessage?: string;
}

interface UseSubmitHandlerReturn {
  loading: boolean;
  error: string | null;
  /** Wraps an async submit fn with loading/error handling. Returns the result or undefined on error. */
  handleSubmit: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  clearError: () => void;
}

/**
 * Shared submit handler – eliminates duplicated setLoading/setError/try/catch/finally boilerplate.
 *
 * @example
 * const { loading, error, handleSubmit } = useSubmitHandler({
 *   onSuccess: () => refetch(),
 * });
 *
 * const onSubmit = (e: React.FormEvent) => {
 *   e.preventDefault();
 *   void handleSubmit(() => deleteAccountRequest(password));
 * };
 */
export function useSubmitHandler(
  options: UseSubmitHandlerOptions = {},
): UseSubmitHandlerReturn {
  const { validate, onSuccess, errorMessage } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (validate) {
        const validationError = await validate();
        if (validationError) {
          setError(validationError);
          return undefined;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        if (onSuccess) await onSuccess();
        return result;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail ?? errorMessage ?? 'Ein Fehler ist aufgetreten.');
        } else {
          setError(errorMessage ?? 'Ein unbekannter Fehler ist aufgetreten.');
        }
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [validate, onSuccess, errorMessage],
  );

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, handleSubmit, clearError };
}

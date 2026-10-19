import axios from 'axios';
import { useState } from 'react';

interface UseSimpleFormOptions<TForm> {
  initialForm: TForm;
  submitFn: (form: TForm) => Promise<{ message: string }>;
  validate?: (form: TForm) => string | null;
}

/**
 * Generic base hook for simple form state management.
 *
 * Provides form state, loading/error/success feedback, and a handleSubmit function.
 * Optionally accepts a validate function that runs before submission.
 */
export function useSimpleForm<TForm>({
  initialForm,
  submitFn,
  validate,
}: UseSimpleFormOptions<TForm>) {
  const [form, setForm] = useState<TForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (validate) {
      const validationError = validate(form);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await submitFn(form);
      setSuccess(res.message);
      setForm(initialForm);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Ein Fehler ist aufgetreten.');
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { form, setForm, loading, error, success, handleSubmit };
}

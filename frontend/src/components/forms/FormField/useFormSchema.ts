import { useContext } from 'react';

import { FormContext } from './FormProvider.context';

import type { FormSchema } from './FormProvider.types';

/** Returns the Zod schema from the FormProvider context, or null when absent. */
export function useFormSchema(): FormSchema | null {
  const ctx = useContext(FormContext);
  return ctx?.schema ?? null;
}

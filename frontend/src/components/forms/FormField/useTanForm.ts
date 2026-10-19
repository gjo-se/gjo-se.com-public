import { useContext } from 'react';

import { FormContext } from './FormProvider.context';

import type { FormInstance } from './FormProvider.types';

/** Returns the TanStack form instance from the FormProvider context. */
export function useTanForm(): FormInstance {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('useTanForm must be used inside <FormProvider>');
  return ctx.form;
}

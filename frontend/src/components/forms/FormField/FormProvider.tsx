import { useMemo } from 'react';

import { FormContext } from './FormProvider.context';

import type { FormProviderProps } from './FormProvider.interface';

/** Provides TanStack form instance and optional Zod schema via React context to all descendant FormField components. */
export default function FormProvider({ form, schema = null, children }: FormProviderProps) {
  const value = useMemo(() => ({ form, schema }), [form, schema]);
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export type { FormProviderProps } from './FormProvider.interface';

import { createContext } from 'react';

import type { FormContextValue } from './FormProvider.types';

/** React context carrying the TanStack form instance and optional Zod schema. */
export const FormContext = createContext<FormContextValue>(null!);

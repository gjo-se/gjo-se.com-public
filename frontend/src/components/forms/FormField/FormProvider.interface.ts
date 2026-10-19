import type { FormInstance, FormSchema } from './FormProvider.types';
import type { ReactNode } from 'react';


export interface FormProviderProps {
  form: FormInstance
  schema?: FormSchema | null
  children: ReactNode
}

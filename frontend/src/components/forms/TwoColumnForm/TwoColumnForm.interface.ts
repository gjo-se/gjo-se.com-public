import type { FormEvent, ReactNode } from 'react';

export interface TwoColumnFormProps {
  formProps: {
    title: string
    loading: boolean
    saving: boolean
    error: string
    onSave: (e?: FormEvent) => void | Promise<void>
    onCancel: () => void
  }
  children: ReactNode
}

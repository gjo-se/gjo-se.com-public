import type { FormEvent } from 'react';

export interface TwoColumnFormData {
  title: string
  loading: boolean
  saving: boolean
  error: string
  onSave: (e?: FormEvent) => void | Promise<void>
  onCancel: () => void
}

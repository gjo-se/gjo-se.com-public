export type FormState = ResetPasswordFormState;

export type ResetPasswordFormState = 'validating' | 'idle' | 'loading' | 'success' | 'error';

export interface ResetPasswordFormVariants {
  state?: ResetPasswordFormState;
}

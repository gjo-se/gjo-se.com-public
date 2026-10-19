export type ForgotPasswordFormState = 'idle' | 'loading' | 'success';

export interface ForgotPasswordFormVariants {
  state?: ForgotPasswordFormState;
}

export type FormState = ForgotPasswordFormState;

export type VerifyEmailFormState = 'loading' | 'success' | 'error' | 'expired';

export interface VerifyEmailFormVariants {
  state?: VerifyEmailFormState;
}

export type VerifyState = VerifyEmailFormState;

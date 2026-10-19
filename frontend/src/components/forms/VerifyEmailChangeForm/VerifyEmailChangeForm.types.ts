export type VerifyEmailChangeFormState = 'loading' | 'success' | 'error';

export interface VerifyEmailChangeFormVariants {
  state?: VerifyEmailChangeFormState;
}

export type VerifyState = VerifyEmailChangeFormState;

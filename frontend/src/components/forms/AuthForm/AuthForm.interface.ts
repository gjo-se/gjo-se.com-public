import type { AuthFormVariants } from './AuthForm.types';

export interface AuthFormProps extends AuthFormVariants {
  onSuccess?: (user: { id: number; email: string; name: string; role: string; is_active: boolean }) => void
}

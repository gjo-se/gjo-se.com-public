import { useState } from 'react';

import Button from '@src/components/primitives/Button';
import Chip from '@src/components/primitives/Chip';
import Input from '@src/components/primitives/Input';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { forgotPasswordRequest } from '@src/features/auth';
import { route } from '@src/router.derived';


import type { ForgotPasswordFormProps } from './ForgotPasswordForm.interface';
import type { FormState } from './ForgotPasswordForm.types';

/**
 * ForgotPasswordForm – Formular zum Anfordern einer Passwort-Reset-E-Mail.
 * Neutrales Feedback – verhindert User-Enumeration.
 */
export default function ForgotPasswordForm(_props: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setState('loading');

    try {
      await forgotPasswordRequest(email);
      setState('success');
    } catch {
      setState('idle');
      setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {state === 'success' ? (
          <div className="space-y-4 text-center">
            <Text variant="h1" weight="bold">E-Mail unterwegs ✓</Text>
            <Text color="secondary">
              Falls die Adresse bei uns bekannt ist, erhältst du in Kürze eine E-Mail mit einem
              Link zum Zurücksetzen deines Passworts.
            </Text>
            <Link to={route.login} />
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Text variant="subtitle" weight="semibold">Passwort vergessen</Text>
            <Text color="secondary">Gib deine E-Mail-Adresse ein – wir senden dir einen Link zum Zurücksetzen.</Text>
            {errorMessage && <Text size="sm" color="error">{errorMessage}</Text>}

            <div className="flex flex-col gap-1.5">
              <Text as="label" variant="label" weight="medium" color="secondary">
                E-Mail
                <Chip variant="error" size="sm" aria-hidden>*</Chip>
              </Text>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required autoComplete="email" />
            </div>

            <Button submit variant="default" loading={state === 'loading'} disabled={state === 'loading'}>
              Reset-Link anfordern
            </Button>
            <Link to={route.login} size="sm" variant="muted" />
          </form>
        )}
      </div>
    </div>
  );
}

export type { ForgotPasswordFormProps } from './ForgotPasswordForm.interface';

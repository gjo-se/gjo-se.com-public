import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import Button from '@src/components/primitives/Button';
import Chip from '@src/components/primitives/Chip';
import Input from '@src/components/primitives/Input';
import Link from '@src/components/primitives/Link';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { resetPasswordRequest,validateResetTokenRequest } from '@src/features/auth';
import { route } from '@src/router.derived';


import { extractResetError } from './ResetPasswordForm.logic';

import type { ResetPasswordFormProps } from './ResetPasswordForm.interface';
import type { FormState } from './ResetPasswordForm.types';

/** Renders the password reset form with new password and confirmation fields. */
export default function ResetPasswordForm({ showcaseToken }: ResetPasswordFormProps) {
  const [searchParams] = useSearchParams();
  const token = showcaseToken ?? searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [state, setState] = useState<FormState>(() => (token ? 'validating' : 'error'));
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    token ? null : 'Kein Reset-Token in der URL gefunden. Bitte fordere einen neuen Link an.',
  );
  const hasValidated = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (hasValidated.current) return;
    hasValidated.current = true;

    validateResetTokenRequest(token)
      .then(() => setState('idle'))
      .catch((err) => {
        setState('error');
        const { message } = extractResetError(err);
        setErrorMessage(message);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('Die Passwörter stimmen nicht überein.');
      return;
    }

    setState('loading');

    try {
      await resetPasswordRequest(token, newPassword);
      setState('success');
    } catch (err) {
      setState('error');
      const { message } = extractResetError(err);
      setErrorMessage(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {state === 'validating' && (
          <div className="flex flex-col items-center gap-4">
            <Spinner />
            <Text variant="body">Link wird geprüft ...</Text>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <Text variant="h1" weight="bold">Passwort geändert ✓</Text>
            <Text variant="body">Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.</Text>
            <Link to={route.login}>
              <Button variant="default" fullWidth>{route.login.label}</Button>
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <Text variant="h1" weight="bold">Link ungültig</Text>
            <Text size="sm" color="error">{errorMessage}</Text>
            <Link to={route.forgotPassword}>
              <Button variant="default" fullWidth>{route.forgotPassword.label}</Button>
            </Link>
            <Link to={route.login} />
          </div>
        )}

        {(state === 'idle' || state === 'loading') && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Text variant="subtitle" weight="semibold">Neues Passwort setzen</Text>

            {errorMessage && <Text size="sm" color="error">{errorMessage}</Text>}

            <div className="flex flex-col gap-1.5">
              <Text as="label" variant="label" weight="medium" color="secondary">
                Neues Passwort
                <Chip variant="error" size="sm" aria-hidden>*</Chip>
              </Text>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Text as="label" variant="label" weight="medium" color="secondary">
                Passwort wiederholen
                <Chip variant="error" size="sm" aria-hidden>*</Chip>
              </Text>
              <Input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
            </div>

            <Button submit variant="default" loading={state === 'loading'} disabled={state === 'loading'}>
              Passwort speichern
            </Button>
            <Link to={route.login} size="sm" variant="muted" />
          </form>
        )}
      </div>
    </div>
  );
}

export type { ResetPasswordFormProps } from './ResetPasswordForm.interface';

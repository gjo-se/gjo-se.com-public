import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import Button from '@src/components/primitives/Button';
import Input from '@src/components/primitives/Input';
import Link from '@src/components/primitives/Link';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { resendVerificationRequest,verifyEmailRequest } from '@src/features/auth';
import { route } from '@src/router.derived';


import type { VerifyEmailFormProps } from './VerifyEmailForm.interface';
import type { VerifyState } from './VerifyEmailForm.types';

/**
 * VerifyEmailForm – E-Mail-Verifikations-Flow mit Resend-Formular.
 * Liest token aus URL, verifiziert, zeigt Erfolgs-/Fehlerzustand.
 */
export default function VerifyEmailForm(_props: VerifyEmailFormProps) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [state, setState] = useState<VerifyState>(() => (!token ? 'error' : 'loading'));
  const [resendEmail, setResendEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (hasVerified.current) return;
    hasVerified.current = true;

    verifyEmailRequest(token)
      .then(() => setState('success'))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 400) {
          const detail: string = err.response.data?.detail ?? '';
          setState(detail.toLowerCase().includes('expired') ? 'expired' : 'error');
        } else {
          setState('error');
        }
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);
    try {
      const response = await resendVerificationRequest(resendEmail);
      setResendMessage(response.message);
    } catch {
      setResendMessage('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Spinner />
            <Text variant="body">E-Mail-Adresse wird bestätigt ...</Text>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <Text variant="h1" weight="bold">E-Mail bestätigt ✓</Text>
            <Text variant="body">Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du kannst dich jetzt anmelden.</Text>
            <Link to={route.login}>
              <Button variant="default" fullWidth>{route.login.label}</Button>
            </Link>
          </div>
        )}

        {(state === 'error' || state === 'expired') && (
          <div className="space-y-4">
            <Text variant="h1" weight="bold">{state === 'expired' ? 'Link abgelaufen' : 'Ungültiger Link'}</Text>
            <Text variant="body">
              {state === 'expired'
                ? 'Dein Bestätigungslink ist abgelaufen. Fordere einen neuen an.'
                : 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.'}
            </Text>

            {resendMessage ? (
              <Text size="sm" color="success">{resendMessage}</Text>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 text-left">
                <Input type="email" placeholder="Deine E-Mail-Adresse" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} required autoComplete="email" />
                <Button submit variant="default" fullWidth disabled={resendLoading}>
                  {resendLoading ? <Spinner size="sm" /> : 'Neue Bestätigungs-E-Mail anfordern'}
                </Button>
              </form>
            )}

            <Link to={route.login} size="sm" variant="muted" />
          </div>
        )}
      </div>
    </div>
  );
}

export type { VerifyEmailFormProps } from './VerifyEmailForm.interface';

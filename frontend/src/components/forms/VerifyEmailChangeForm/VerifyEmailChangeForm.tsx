import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import Button from '@src/components/primitives/Button';
import Link from '@src/components/primitives/Link';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { verifyEmailChangeRequest } from '@src/features/auth';
import { route } from '@src/router.derived';


import type { VerifyEmailChangeFormProps } from './VerifyEmailChangeForm.interface';
import type { VerifyState } from './VerifyEmailChangeForm.types';

/**
 * VerifyEmailChangeForm – Bestätigungs-Flow für E-Mail-Adressänderung.
 * Liest token aus URL, verifiziert beim Mount.
 */
export default function VerifyEmailChangeForm(_props: VerifyEmailChangeFormProps) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [state, setState] = useState<VerifyState>(() => (token ? 'loading' : 'error'));
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (hasVerified.current) return;
    hasVerified.current = true;

    verifyEmailChangeRequest(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Spinner />
            <Text variant="body">Neue E-Mail-Adresse wird bestätigt ...</Text>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <Text variant="h1" weight="bold">E-Mail-Adresse geändert ✓</Text>
            <Text variant="body">Deine E-Mail-Adresse wurde erfolgreich geändert. Du kannst dich ab sofort mit der neuen Adresse anmelden.</Text>
            <Link to={route.userDashboard}>
              <Button variant="default" fullWidth>{route.userDashboard.label}</Button>
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <Text variant="h1" weight="bold">Ungültiger Link</Text>
            <Text variant="body">Dieser Bestätigungslink ist ungültig, abgelaufen oder wurde bereits verwendet. Bitte fordere eine neue E-Mail-Änderung in deinem Dashboard an.</Text>
            <Link to={route.userDashboard}>
              <Button variant="default" fullWidth>{route.userDashboard.label}</Button>
            </Link>
            <Link to={route.login} size="sm" variant="muted" />
          </div>
        )}
      </div>
    </div>
  );
}

export type { VerifyEmailChangeFormProps } from './VerifyEmailChangeForm.interface';

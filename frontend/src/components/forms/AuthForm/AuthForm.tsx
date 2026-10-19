import { useForm } from '@tanstack/react-form';
import axios from 'axios';
import { useState } from 'react';

import FormField from '@src/components/forms/FormField/FormField';
import FormProvider from '@src/components/forms/FormField/FormProvider';
import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { DevLoginBypass } from '@src/features/auth';
import { useAuth } from '@src/features/auth';
import { loginRequestSchema, registerRequestSchema } from '@src/lib/schemasGenerated';
import { useContent } from '@src/providers/siteContent/useContent';

import type { AuthFormProps } from './AuthForm.interface';

/**
 * AuthForm – Login-/Registrierungsformular (Auth-Flow, Dummy login.html / #2832).
 *
 * Form-Optik wie `/contact`: `FormProvider` + TanStack Form + `FormField layout="floating"`,
 * Submit als Site-CTA (`Button variant="default"` + persistenter `→`). Login-Texte kommen
 * aus `login.*`-Content-Keys (DE/EN); Fehlermeldungen bleiben generisch – keine
 * Backend-Rohmeldungen. Der Registrierungs-Zweig ist über keine Route erreichbar und
 * behält deutsche Labels. Dev-Login-Bypass bleibt für mode="login".
 */
export default function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const { lang } = useLanguage();
  const { data: content } = useContent(lang);
  const { login, register } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const emailLabel = content['login.form.emailLabel'] ?? 'E-Mail';
  const passwordLabel = content['login.form.passwordLabel'] ?? 'Passwort';
  const submitLabel = content['login.form.submitCta'] ?? 'Anmelden';

  const form = useForm({
    defaultValues: { email: '', name: '', password: '', passwordConfirm: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccessMessage(null);

      if (!isLogin) {
        if (value.password.length < 8) {
          setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
          return;
        }
        if (value.password !== value.passwordConfirm) {
          setError('Die Passwörter stimmen nicht überein.');
          return;
        }
      }

      setIsLoading(true);
      try {
        if (isLogin) {
          const userData = await login(value.email, value.password);
          onSuccess?.(userData);
        } else {
          await register(value.email, value.name, value.password);
          setSuccessMessage('Registrierung erfolgreich. Bitte prüfe deine E-Mails zur Bestätigung.');
        }
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          if (isLogin) {
            setError(
              status === 403
                ? (content['login.error.emailNotVerified'] ??
                    'Die E-Mail-Adresse ist noch nicht bestätigt.')
                : (content['login.error.invalidCredentials'] ?? 'E-Mail oder Passwort falsch.'),
            );
          } else if (status === 400) {
            setError('Diese E-Mail-Adresse ist bereits registriert.');
          } else {
            setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
          }
        } else {
          setError(content['login.error.unknown'] ?? 'Ein unbekannter Fehler ist aufgetreten.');
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <>
      <FormProvider form={form} schema={isLogin ? loginRequestSchema : registerRequestSchema}>
        <form
          className="flex flex-col gap-6 text-base leading-copy"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3">
              <Text size="sm" color="error">
                {error}
              </Text>
            </div>
          )}
          {successMessage && (
            <Text size="sm" color="success">
              {successMessage}
            </Text>
          )}

          {!isLogin && <FormField name="name" layout="floating" label="Name" />}

          <FormField name="email" type="email" layout="floating" label={emailLabel} />

          <FormField
            name="password"
            type="password"
            layout="floating"
            label={passwordLabel}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <FormField
              name="passwordConfirm"
              type="password"
              layout="floating"
              label="Passwort wiederholen"
            />
          )}

          <Button submit variant="default" size="lg" fullWidth loading={isLoading} disabled={isLoading}>
            {isLogin ? submitLabel : 'Registrieren'}
            {/* Site-CTA-Idiom: persistenter Pfeil wie bei `Link variant="cta"` */}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-150 group-hover/button:translate-x-0.5"
            >
              →
            </span>
          </Button>
        </form>
      </FormProvider>
      {isLogin && onSuccess && <DevLoginBypass onSuccess={onSuccess} />}
    </>
  );
}

export type { AuthFormMode, AuthFormVariants } from './AuthForm.types';
export type { AuthFormProps } from './AuthForm.interface';

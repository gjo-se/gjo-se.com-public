/**
 * ContactForm – Öffentliches Kontakt-Formular (3 Felder) mit Inline-Validierung.
 *
 * Rendering + Submit-Orchestrierung (keine Store-/API-Calls direkt):
 *   – `useForm()` (TanStack Form) + `FormProvider` mit dem generierten
 *     `contactSubmissionCreateSchema` für die Inline-Validierung (FormField).
 *   – Versteckte Felder als Hook-State (nicht als FormField): `lang`,
 *     `page`, `token`, `honeypot`. `token` kommt aus `useContactToken()`
 *     (server-signierter Nachweis), `honeypot` wird als unsichtbares
 *     Input gerendert (Füllung durch Bots = Spam).
 *   – Submit → `submitContact(payload)`; Erfolg → Success-Meldung,
 *     Fehler → Fehlermeldung + Retry.
 */
import { useForm } from '@tanstack/react-form';
import { cva } from 'class-variance-authority';
import { useState } from 'react';
import { useLocation } from 'react-router';

import Content from '@src/components/atoms/Content/Content';
import FormField from '@src/components/forms/FormField/FormField';
import FormProvider from '@src/components/forms/FormField/FormProvider';
import Button from '@src/components/primitives/Button';
import Input from '@src/components/primitives/Input';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { localePath } from '@src/lib/locale';
import { contactSubmissionCreateSchema } from '@src/lib/schemasGenerated';
import { useContent } from '@src/providers/siteContent/useContent';
import { route } from '@src/router.derived';

import { useContactToken } from '../../hooks/useContactToken';
import { submitContact } from '../../services/contactService';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

/** Honeypot-, Fehler- und CTA-Pfeil-Flächen des Kontaktformulars. */
const honeypotVariants = cva(
  'absolute left-offscreen h-0 w-0 overflow-hidden border-0 p-0 opacity-0',
);
const errorBannerVariants = cva(
  'space-y-3 rounded-lg border border-destructive bg-destructive/10 p-5',
);
const ctaArrowVariants = cva(
  'inline-block transition-transform duration-150 group-hover/button:translate-x-0.5',
);

/**
 * ContactForm – rendert das 3-Felder-Kontaktformular und orchestriert den Submit.
 */
export default function ContactForm() {
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  const { data: content } = useContent(lang);

  // Versteckte Felder (Hook-State, bewusst keine FormField-Instanzen)
  // token: server-signierter Nachweis, beim Mount geholt (Spamschutz)
  const { token, reload } = useContactToken();
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const form = useForm({
    defaultValues: { name: '', email: '', message: '' },
    onSubmit: async ({ value }) => {
      if (token === null) {
        setState('error');
        return;
      }
      setState('submitting');
      try {
        await submitContact({
          ...value,
          page: pathname,
          lang,
          honeypot,
          token,
        });
        setState('success');
      } catch {
        setState('error');
      }
    },
  });

  if (state === 'success') {
    return (
      <div className="space-y-4">
        <Text variant="h2" weight="bold">
          <Content id="contact.success.title" inline />
        </Text>
        <Content id="contact.success.body" />
      </div>
    );
  }

  return (
    <FormProvider form={form} schema={contactSubmissionCreateSchema}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            name="name"
            layout="floating"
            label={content['contact.form.nameLabel'] ?? 'Name'}
          />
          <FormField
            name="email"
            layout="floating"
            type="email"
            label={content['contact.form.emailLabel'] ?? 'E-Mail'}
          />
        </div>
        <FormField
          name="message"
          layout="floating"
          type="textarea"
          label={content['contact.form.messageLabel'] ?? 'Nachricht'}
        />

        {/* Honeypot – für Nutzer/AT unsichtbar, für Bots ein attraktives Textfeld.
            Off-screen/geclippt auf einem Wrapper: das `Input`-Atom gibt kein
            `className`/`style` durch, der Feldname `website` bleibt erhalten. */}
        <div
          className={honeypotVariants()}
          aria-hidden="true"
        >
          <Input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot((e.target as HTMLInputElement).value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {state === 'error' && (
          <div className={errorBannerVariants()}>
            <Text size="sm" color="error" weight="semibold">
              <Content id="contact.error.title" inline />
            </Text>
            <Content id="contact.error.description" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reload();
                void form.handleSubmit();
              }}
            >
              <Content id="contact.error.retry" inline />
            </Button>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Button
            submit
            variant="default"
            size="lg"
            loading={state === 'submitting'}
            disabled={state === 'submitting' || token === null}
          >
            <Content id="contact.form.submitCta" inline />
            {/* Site-CTA-Idiom: persistenter Pfeil wie bei `Link variant="cta"` */}
            <div
              aria-hidden="true"
              className={ctaArrowVariants()}
            >
              →
            </div>
          </Button>
        </div>

        {/* Datenschutz-Information an der Erhebungsstelle (Art. 13 DSGVO) –
            bewusst kein Einwilligungs-Häkchen: Rechtsgrundlage ist die Anfrage selbst. */}
        <div className="mt-4">
          <Text variant="caption" color="muted" align="center">
            <Content id="contact.form.privacyHint" inline />{' '}
            <Link to={localePath(route.privacy, lang)} size="sm" variant="muted" underline>
              <Content id="contact.form.privacyLink" inline />
            </Link>
          </Text>
        </div>
      </form>
    </FormProvider>
  );
}

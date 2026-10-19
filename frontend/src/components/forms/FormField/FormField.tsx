import { useMemo, useState } from 'react';

import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import Textarea from '@src/components/primitives/Textarea';

import { useLanguage } from '../../../contexts/LanguageContext';
import { cn } from '../../../lib/utils';
import { translateZodIssue } from '../../../locales/validation';

import { formOverrides } from './FormField.utils';
import { useFormSchema } from './useFormSchema';
import { useTanForm } from './useTanForm';


import type { FormFieldProps } from './FormField.interface';
import type { TanField } from './FormProvider.types';
import type { ZodTypeAny } from 'zod';

/** Renders a labelled form field with error display and optional Zod validation. */
export default function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  layout = 'row',
}: FormFieldProps) {
  const form = useTanForm();
  const contextSchema = useFormSchema();
  const { lang } = useLanguage();
  const [focused, setFocused] = useState(false);
  const isFloating = layout === 'floating';
  const id = `ff-${name}`;

  // Feld-Schema aus dem Form-Context, mit Overrides für Form-Repräsentation
  const schema = useMemo<ZodTypeAny | undefined>(() => {
    if (formOverrides[name]) return formOverrides[name];
    if (!contextSchema) return undefined;
    return (contextSchema.shape as Record<string, ZodTypeAny>)[name];
  }, [contextSchema, name]);

  return (
    <form.Field
      name={name}
      validators={{
        ...(schema
          ? {
              onChange: ({ value }: { value: unknown }) => {
                const result = schema.safeParse(value);
                if (result.success) return undefined;
                const issue = result.error.issues[0];
                return issue
                  ? translateZodIssue(issue, name, lang as 'de' | 'en')
                  : 'Ungültige Eingabe';
              },
            }
          : {}),
      }}
    >
      {(field: unknown) => {
        const fieldApi = field as TanField;
        const error = getFirstError(fieldApi.state.meta.errors);

        const controlClassName = cn(
          'flex min-w-0 flex-col gap-1',
          layout === 'column' &&
            [
              '[&_input]:h-auto [&_input]:rounded-md [&_input]:border-border [&_input]:bg-transparent',
              '[&_input]:px-4 [&_input]:py-[0.75rem] [&_input]:!text-[0.9375rem] [&_input]:shadow-none',
              '[&_input]:placeholder:text-on-surface-subtle',
              '[&_textarea]:h-auto [&_textarea]:min-h-[10rem] [&_textarea]:rounded-md',
              '[&_textarea]:border-border [&_textarea]:bg-transparent [&_textarea]:px-4',
              '[&_textarea]:py-[0.75rem] [&_textarea]:!text-[0.9375rem] [&_textarea]:shadow-none',
              '[&_textarea]:placeholder:text-on-surface-subtle',
            ].join(' '),
          error &&
            '[&_input]:border-destructive [&_input]:focus:ring-destructive-ring',
          error &&
            '[&_textarea]:border-destructive [&_textarea]:focus:ring-destructive-ring',
        );

        // Bei `floating` ist das Label der Hinweis – ein echter Placeholder wird bewusst
        // nicht gezeigt (sonst doppelte Info im leeren Feld).
        const effectivePlaceholder = isFloating ? ' ' : placeholder;
        const handleBlur = () => {
          setFocused(false);
          fieldApi.handleBlur();
        };
        const handleFocus = () => setFocused(true);

        const control = type === 'textarea' ? (
          <Textarea
            id={id}
            name={name}
            value={fieldApi.state.value as string}
            onChange={(e) => fieldApi.handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            rows={7}
            placeholder={effectivePlaceholder}
          />
        ) : (
          <Input
            id={id}
            name={name}
            type={type}
            autoComplete={autoComplete}
            value={fieldApi.state.value as string}
            onChange={(e) => fieldApi.handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={effectivePlaceholder}
          />
        );

        if (isFloating) {
          // Label liegt leer im Feld und schwebt bei Fokus/Inhalt als kleine
          // Überschrift nach oben – Label bleibt damit jederzeit sichtbar (WCAG 3.3.2).
          const floatingControlClassName = cn(
            'relative w-full',
            type === 'textarea'
              ? [
                  '[&_textarea]:h-auto [&_textarea]:min-h-[10rem] [&_textarea]:rounded-md',
                  '[&_textarea]:border-border [&_textarea]:bg-transparent [&_textarea]:px-4',
                  '[&_textarea]:pt-8 [&_textarea]:pb-2 [&_textarea]:!text-[0.9375rem] [&_textarea]:shadow-none',
                  '[&_textarea]:placeholder:text-transparent',
                ].join(' ')
              : [
                  '[&_input]:h-auto [&_input]:rounded-md [&_input]:border-border [&_input]:bg-transparent',
                  '[&_input]:px-4 [&_input]:pt-6 [&_input]:pb-2 [&_input]:!text-[0.9375rem] [&_input]:shadow-none',
                  '[&_input]:placeholder:text-transparent',
                ].join(' '),
            error && '[&_input]:border-destructive [&_textarea]:border-destructive',
          );
          const hasValue = String((fieldApi.state.value ?? '') as string).length > 0;
          const isFloated = focused || hasValue;
          const restingLabel =
            type === 'textarea'
              ? 'top-8 text-[0.9375rem] normal-case tracking-normal text-on-surface-subtle'
              : 'top-1/2 -translate-y-1/2 text-[0.9375rem] normal-case tracking-normal text-on-surface-subtle';
          const floatedLabel = focused
            ? 'top-2 text-[0.6875rem] uppercase tracking-[0.08em] text-primary'
            : 'top-2 text-[0.6875rem] uppercase tracking-[0.08em] text-on-surface-muted';

          return (
            <div className="flex w-full flex-col gap-1">
              <div className={floatingControlClassName}>
                {control}
                <label
                  htmlFor={id}
                  className={cn(
                    'pointer-events-none absolute left-4 z-10 font-mono transition-all duration-150 ease-out',
                    isFloated ? floatedLabel : restingLabel,
                  )}
                >
                  {label}
                </label>
              </div>
              {error && (
                <Text size="xs" color="error">
                  {error}
                </Text>
              )}
            </div>
          );
        }

        return (
          <div
            className={cn(
              layout === 'column'
                ? 'flex flex-col gap-1.5'
                : 'grid grid-cols-form-field items-start gap-4',
            )}
          >
            {layout === 'column' ? (
              <>
                <label
                  htmlFor={id}
                  className="font-mono text-xs font-medium uppercase tracking-caps text-on-surface-muted"
                >
                  {label}
                </label>
                <div className={cn('w-full', controlClassName)}>
                  {control}
                  {error && (
                    <Text size="xs" color="error">
                      {error}
                    </Text>
                  )}
                </div>
              </>
            ) : (
              <>
                <label
                  htmlFor={id}
                  className="break-words pt-2 text-right text-sm font-medium text-on-surface-secondary"
                >
                  {label}
                </label>
                <div className={controlClassName}>
                  {control}
                  {error && (
                    <Text size="xs" color="error">
                      {error}
                    </Text>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }}
    </form.Field>
  );
}

export type { FormFieldType, FormFieldVariants, FormFieldLayout } from './FormField.types';
export type { FormFieldProps } from './FormField.interface';

function getFirstError(errors: unknown): string | undefined {
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const first = errors[0];
  if (typeof first === 'string') return first;
  return (first as Record<string, unknown>)?.message as string | undefined;
}

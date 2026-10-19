/**
 * ExperienceForm – Feld-Layout des ExperienceDialog.
 *
 * Sprachneutrale Skalar-Felder oben, darunter die Textblöcke der aktiven
 * Sprache (DE/EN). Die jeweils andere Sprache bleibt im Form-State erhalten und
 * wird beim Speichern mitgeschrieben. Ausschließlich `FormField` mit
 * `name` + `label` (Muster ContactForm, Pydantic-Schema als SSOT).
 */
import FormField from '@src/components/forms/FormField/FormField';
import FormProvider from '@src/components/forms/FormField/FormProvider';
import type { FormProviderProps } from '@src/components/forms/FormField/FormProvider';
import Text from '@src/components/primitives/Text';

interface ExperienceFormProps {
  form: FormProviderProps['form'];
  schema: FormProviderProps['schema'];
  locale: 'de' | 'en';
}

/** Locale-Textblock-Felder: Feldname (aus dem BE-Schema) + Label + Zeiligkeit. */
const LOCALE_FIELDS: { key: string; label: string; multiline: boolean }[] = [
  { key: 'context', label: 'Kontext', multiline: true },
  { key: 'outcome', label: 'Ergebnis / Impact', multiline: true },
  { key: 'problem', label: 'Problemstellung', multiline: true },
  { key: 'scope', label: 'Umfang / Scope', multiline: true },
  { key: 'solution_what', label: 'Lösung (WAS)', multiline: true },
  { key: 'tech_stack', label: 'Tech-Stack (komma-separiert)', multiline: false },
  { key: 'evidence', label: 'Belege / Nachweise', multiline: true },
];

/** Feld-Layout des ExperienceDialog für die aktive Sprache. */
export default function ExperienceForm({ form, schema, locale }: ExperienceFormProps) {
  return (
    <FormProvider form={form} schema={schema}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField name="position" label="Rolle" />
          <FormField name="company" label="Firma (intern)" />
          <FormField name="project_url" label="Projekt-Link" />
          <FormField name="start_date" label="Startdatum" type="date" />
          <FormField name="end_date" label="Enddatum (leer = laufend)" type="date" />
        </div>

        <div className="flex flex-col gap-4">
          <Text as="h4" variant="h6">
            {locale === 'de' ? 'Deutsch' : 'English'}
          </Text>
          {LOCALE_FIELDS.map((field) => (
            <FormField
              key={field.key}
              name={`translations.${locale}.${field.key}`}
              label={field.label}
              type={field.multiline ? 'textarea' : 'text'}
            />
          ))}
        </div>
      </div>
    </FormProvider>
  );
}

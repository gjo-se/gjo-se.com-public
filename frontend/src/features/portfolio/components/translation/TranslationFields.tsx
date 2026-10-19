/**
 * TranslationFields – Übersetzbare Felder einer Portfolio-Locale (DE/EN).
 *
 * Rendert die Kurztexte (title, sub_title, teaser, impact_summary) als
 * DetailTable-Rows mit Inline-Edit; der Impact-Summary als Custom-Row mit
 * InlineMarkdownEditRow.
 */
import InlineMarkdownEditRow from '@src/components/molecules/InlineMarkdownEditRow/InlineMarkdownEditRow';
import DetailTable from '@src/components/organisms/DetailTable/DetailTable';
import type { DetailRow } from '@src/components/organisms/DetailTable/DetailTable';
import type { components } from '@src/lib/types.generated';

type LocaleFields = components['schemas']['LocaleFieldsOut'];

interface TranslationFieldsProps {
  /** Locale dieser Übersetzung ('de' | 'en'). */
  locale: 'de' | 'en';
  /** Lokalisierte Felder (undefined solange Locale-Row nicht existiert). */
  translation: LocaleFields | undefined;
  /** Persistiert ein Feld (field → value). */
  onSave: (field: string, value: string) => Promise<void>;
}

/** Übersetzbare Felder einer Portfolio-Locale. */
export function TranslationFields({ locale, translation, onSave }: TranslationFieldsProps) {
  const textRows: DetailRow[] = [
    { label: 'Titel', field: 'title', value: translation?.title ?? null },
    { label: 'Sub-Titel', field: 'sub_title', value: translation?.sub_title ?? null },
    { label: 'Teaser', field: 'teaser', value: translation?.teaser ?? null },
  ];

  return (
    <DetailTable title={`${locale.toUpperCase()} – Übersetzung`} rows={textRows} onSave={onSave}>
      <InlineMarkdownEditRow label="Impact-Summary" field="impact_summary" value={translation?.impact_summary ?? null} onSave={onSave} />
    </DetailTable>
  );
}

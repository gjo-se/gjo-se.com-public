/**
 * Bilinguale Übersetzungen für Zod-Validierungsfehler (Zod v4).
 *
 * `translateZodIssue` ist die EINZIGE Übersetzungsfunktion für Zod-Issues (fe-form-standards).
 * Die Sprache wird aus der URL abgeleitet (`useLanguage`, '/en' → en). Technische
 * Validierungstexte sind bewusst Code-Locale (DE/EN) und keine `site_content`-Keys.
 *
 * Zod v4 issue structure:
 *   too_small:      { origin, code, minimum, inclusive, … }
 *   too_big:        { origin, code, maximum, inclusive, … }
 *   invalid_format: { origin, code, format, pattern?, … }
 *   invalid_type:   { expected, code, received?, … }
 */

import type { ZodIssue } from 'zod';

type IssueLike = ZodIssue & Record<string, unknown>;

/** A per-code translator: renders one Zod v4 issue in the requested language. */
type IssueTranslator = (issue: IssueLike, de: boolean) => string;

export type ValidationLanguage = 'de' | 'en';

const fieldSpecific: Record<string, Record<string, Record<ValidationLanguage, string>>> = {
  slug: {
    invalid_format: {
      de: 'Nur Kleinbuchstaben (a–z), Ziffern (0–9) und Bindestriche (-) erlaubt',
      en: 'Only lowercase letters (a–z), digits (0–9) and hyphens (-) allowed',
    },
    unique: { de: 'Slug bereits vergeben', en: 'Slug already taken' },
  },
};

/** Picks the German or English variant of a message pair. */
function t(de: boolean, deText: string, enText: string): string {
  return de ? deText : enText;
}

/** Translates an `invalid_format` issue (email/url/default). */
function translateInvalidFormat(i: IssueLike, de: boolean): string {
  const fmt = i.format as string | undefined;
  if (fmt === 'email') return t(de, 'Ungültige E-Mail-Adresse', 'Invalid email address');
  if (fmt === 'url') return t(de, 'Ungültige URL', 'Invalid URL');
  return t(de, 'Ungültiges Format', 'Invalid format');
}

/** Translates an `invalid_type` issue (list/object label or the raw expected type). */
function translateInvalidType(i: IssueLike, de: boolean): string {
  const expected = i.expected as string | undefined;
  if (!expected) return t(de, 'Ungültiger Wert', 'Invalid value');
  const label = expected === 'array'
    ? t(de, 'Liste', 'list')
    : expected === 'object'
      ? t(de, 'Objekt', 'object')
      : expected;
  return t(de, `Erwartet: ${label}`, `Expected: ${label}`);
}

/** Translates a `too_big` issue (string length vs. numeric maximum). */
function translateTooBig(i: IssueLike, de: boolean): string {
  const max = i.maximum as number | undefined;
  if (i.origin === 'string') {
    return max != null
      ? t(de, `Maximal ${max} Zeichen erlaubt`, `At most ${max} characters allowed`)
      : t(de, 'Eingabe zu lang', 'Input too long');
  }
  return max != null
    ? t(de, `Maximalwert: ${max}`, `Maximum value: ${max}`)
    : t(de, 'Wert zu groß', 'Value too large');
}

/** Translates a `too_small` issue (string length vs. numeric minimum). */
function translateTooSmall(i: IssueLike, de: boolean): string {
  const min = i.minimum as number | undefined;
  if (i.origin === 'string') {
    return min != null
      ? t(de, `Mindestens ${min} Zeichen erforderlich`, `At least ${min} characters required`)
      : t(de, 'Eingabe zu kurz', 'Input too short');
  }
  return min != null
    ? t(de, `Mindestwert: ${min}`, `Minimum value: ${min}`)
    : t(de, 'Wert zu klein', 'Value too small');
}

/** Generic translation by Zod v4 issue code – lookup instead of a wide `switch`. */
const CODE_TRANSLATORS: Record<string, IssueTranslator> = {
  too_small: translateTooSmall,
  too_big: translateTooBig,
  invalid_format: translateInvalidFormat,
  invalid_type: translateInvalidType,
};

/** Übersetzt einen Zod-Issue sprachabhängig (Standard Deutsch). */
export function translateZodIssue(
  issue: ZodIssue,
  fieldName?: string,
  lang: ValidationLanguage = 'de',
): string {
  // 1) Feld-spezifisch (z. B. slug → "Nur Kleinbuchstaben …")
  if (fieldName) {
    const specific = fieldSpecific[fieldName]?.[issue.code];
    if (specific) return specific[lang];
  }

  // 2) Generische Übersetzung nach Zod v4 Issue-Code
  const i = issue as IssueLike;
  const de = lang === 'de';

  const translator = CODE_TRANSLATORS[i.code];
  if (translator) return translator(i, de);

  return (i.message as string) ?? t(de, 'Ungültige Eingabe', 'Invalid input');
}

import type { FormFieldLayout } from './FormField.types';

export interface FormFieldProps {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'email' | 'url' | 'number' | 'password' | 'date'
  placeholder?: string
  /** Autofill-Hinweis für den Browser (z. B. `current-password`, `email`). */
  autoComplete?: string
  /**
   * Label-Anordnung:
   * - `'row'`      – Label links neben dem Feld (Standard, Admin-Formulare).
   * - `'column'`   – Label oben über dem Feld (Public-Formulare).
   * - `'floating'` – Label liegt leer im Feld und schwebt bei Fokus/Inhalt als
   *   kleine Überschrift nach oben (Public-Formulare, minimaler Look).
   *   Bei `'floating'` wird `placeholder` ignoriert – das Label ist der Hinweis.
   */
  layout?: FormFieldLayout
}

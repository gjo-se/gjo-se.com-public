import type { ReactNode } from 'react';

export interface DetailSectionProps {
  /** Section header label (usually includes a count, e.g. `Personen (3)`). */
  title: string
  /** Section content rendered below the header inside the bordered card. */
  children: ReactNode
}

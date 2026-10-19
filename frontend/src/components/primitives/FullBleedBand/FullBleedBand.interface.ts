import type { ReactNode } from 'react';

export interface FullBleedBandProps {
  /** Inhalt im Container-Rhythmus (z.B. ProofGrid). */
  children: ReactNode;
  /**
   * Vertikales Sektions-Padding des Inhalts-Containers:
   * `default` = `py-12`, `section` = `py-[clamp(3rem,6vw,6rem)]` (Kanon: Styling über Props).
   */
  padding?: 'default' | 'section';
}

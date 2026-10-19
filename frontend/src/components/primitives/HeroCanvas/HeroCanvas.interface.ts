import type { ReactNode, Ref } from 'react';

export interface HeroCanvasProps {
  /** Inhalt der 21:9-Hero-Fläche (z.B. Bild + Gradient-Overlay oder Radar-Chart). */
  children: ReactNode;
  /** Optionales Band unter der Hero-Fläche (z.B. Impact-/Stat-Summary). */
  footer?: ReactNode;
  /** Ref auf die 21:9-Hero-Fläche – z.B. für Responsive-Größenmessung des Inhalts. */
  innerRef?: Ref<HTMLDivElement>;
}

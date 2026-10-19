import type { SkillRadarItem } from '../../molecules/SkillRadar/SkillRadar.types';

export interface SkillRadarModalProps {
  /** Controls dialog visibility. */
  open: boolean;
  /** Called when the dialog requests to close (backdrop, escape, close button). */
  onOpenChange: (open: boolean) => void;
  /** Group label shown in the dialog title (e.g. "Must‑Have"). */
  label: string;
  /** Skills for the group. */
  skills: SkillRadarItem[];
  /**
   * Variant controls filter logic and chart colors.
   * - ``default``: only confirmed skills with level (blue/green colors).
   * - ``archived``: all skills with level, no status filter (red colors).
   */
  variant?: 'default' | 'archived';
}

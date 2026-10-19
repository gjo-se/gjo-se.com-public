import Text from '@src/components/primitives/Text';

import type { HeroFooterProps } from './HeroFooter.interface';

/**
 * HeroFooter – Seiten-Header als Footer-Band unter einer Hero-Fläche (Portfolio-`impact_summary`-Band-Struktur).
 *
 * Rendert den Seiten-Titel (h1) + optionalen Untertitel. Geteilter Code für alle Heros
 * (SkillGroupHero auf `/skills`, SkillMatchSection im Proof-Modus), damit die Überschrift
 * überall identisch sitzt. Wird als `footer`-Slot des `HeroCanvas` verwendet.
 */
export default function HeroFooter({ title, subtitle }: HeroFooterProps) {
  return (
    <div className="flex flex-col gap-1">
      <Text as="h1" variant="h1">{title}</Text>
      {subtitle && <Text variant="subtitle" color="muted">{subtitle}</Text>}
    </div>
  );
}

export type { HeroFooterProps } from './HeroFooter.interface';

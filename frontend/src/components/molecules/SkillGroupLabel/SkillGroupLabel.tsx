import Text from '@src/components/primitives/Text';

import { skillGroupLabelVariants } from './SkillGroupLabel.variants';

import type { SkillGroupLabelProps } from './SkillGroupLabel.interface';

/**
 * SkillGroupLabel – klarer Gruppen-Name als Text-Overlay in der oberen Ecke einer
 * Radar-Fläche (Hero + Karte einheitlich). Kein Kästchen/Hintergrund – reiner Text,
 * wie der Portfolio-Hero seinen Titel als klaren Text über dem Bild zeigt. Position oben,
 * weil die Radar-Achsenlabels unten sitzen. `pointer-events-none`, damit Klicks zum
 * Radar (Lightbox) durchgehen. `prominent` (Hero) hebt die Schriftgröße an.
 */
export default function SkillGroupLabel({ label, prominent = false }: SkillGroupLabelProps) {
  return (
    <div className={skillGroupLabelVariants()}>
      {prominent ? (
        <Text as="h2" variant="h2">{label}</Text>
      ) : (
        <Text as="span" size="xs" weight="semibold" uppercase color="muted">{label}</Text>
      )}
    </div>
  );
}

export type { SkillGroupLabelVariants } from './SkillGroupLabel.variants';
export type { SkillGroupLabelProps } from './SkillGroupLabel.interface';

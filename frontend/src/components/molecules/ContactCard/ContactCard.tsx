import Chip from '@src/components/primitives/Chip';
import Text from '@src/components/primitives/Text';

import Card from '../../primitives/Card';

import type { ContactCardProps } from './ContactCard.interface';

/**
 * ContactCard – Karte zur Darstellung eines Contacts mit Projekt-Info.
 *
 * Nutzt Card als Layout-Container. Zeigt Contact-Name + Company als Titel
 * und Project-Titel + Similarity-Score als Subtitle.
 *
 * Varianten:
 * - Master (Score = 1.0): grüner Badge "Kanonisch"
 * - default: grauer Percent-Badge
 *
 * No className prop – Styling exclusively via Props.
 */
export default function ContactCard({
  contactName,
  company,
  sourcePmTitle,
  similarityScore,
}: ContactCardProps) {
  const isCanonical = similarityScore === 1;

  return (
    <Card size="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 overflow-hidden">
          <Text variant="label" weight="medium">
            {contactName}
          </Text>
          {company && (
            <Text as="span" size="xs" color="muted">
              {company}
            </Text>
          )}
          <Text as="span" size="xs" color="muted" lineClamp={1}>
            {sourcePmTitle}
          </Text>
        </div>

        <div className="shrink-0">
          {isCanonical ? (
            <Chip variant="success" size="sm">
              Kanonisch
            </Chip>
          ) : (
            <Chip variant="muted" size="sm">
              {formatPercent(similarityScore)}
            </Chip>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatPercent(score: number | null): string {
  if (score == null) return '—';
  return `${Math.round(score * 100)}%`;
}

export type { ContactCardProps } from './ContactCard.interface';

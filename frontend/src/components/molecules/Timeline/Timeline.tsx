import Chip from '@src/components/primitives/Chip';
import Link from '@src/components/primitives/Link';
import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text';

import { cn } from '../../../lib/utils';
import ContentElementHeader from '../ContentElementHeader/ContentElementHeader';

import { timelineConnectorVariants, timelineDotVariants } from './Timeline.variants';

export interface TimelineEntry {
  date: string
  title: string
  description?: string
  badge?: string
  link?: TimelineEntryLink
}
export interface TimelineEntryLink {
  href: string
  label: string
}
export interface TimelineProps {
  items: TimelineEntry[]
  title?: string
}

/**
 * Timeline – Vertikale Zeitleiste mit Punkten und Verbindungslinie.
 * Rendert eine Liste aus TimelineEntries mit Datum, Titel, Badge und Beschreibung.
 * Der letzte Eintrag erhält automatisch keine Verbindungslinie.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <Timeline title="Werdegang" items={[
 *   { date: '2022 – heute', title: 'Senior Developer', badge: 'Firma GmbH', description: 'React, TypeScript' },
 *   { date: '2019 – 2022', title: 'Frontend Developer' },
 * ]} />
 */
export default function Timeline({ items, title }: TimelineProps) {
  return (
    <div>
      {title && <ContentElementHeader title={title} />}
      {items.map((item) => {
        const isLast = items.indexOf(item) === items.length - 1;

        return (
          <div key={`${item.title}-${item.date}`} className="relative flex gap-4">
            {/* Connector */}
            <div className="flex flex-col items-center">
              <div className={timelineDotVariants()} />
              {!isLast && (
                <div className={timelineConnectorVariants()} />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <div className="mb-1">
                <Text variant="caption" color="muted">
                  {item.date}
                </Text>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="label" weight="semibold">
                  {item.title}
                </Text>
                {item.badge && (
                  <Chip variant="info" size="sm">
                    {item.badge}
                  </Chip>
                )}
              </div>
              {item.description && (
                <div className="mt-1">
                  <Markdown>{item.description}</Markdown>
                </div>
              )}
              {item.link && (
                <div className="mt-1">
                  <Link href={item.link.href} external size="sm">
                    {item.link.label}
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { TimelineVariants } from './Timeline.variants';

import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';

import MonoBadge from '../MonoBadge/MonoBadge';

import type { ReactNode } from 'react';

interface OtherChannelCardProps {
  icon: ReactNode;
  title: string;
  badge: string;
  handle: string;
  href: string;
}

/**
 * Profil-Karte (LinkedIn/GitHub): die **ganze** Karte ist der Link – Aufbau im
 * Focus-Karten-Idiom der Home (`Link variant="card"` + Hover-Lift). Der externe
 * ↗-Marker kommt automatisch aus `Link` (`external`); eine separate URL-Zeile und
 * Beschreibung entfallen.
 */
export default function OtherChannelCard({ icon, title, badge, handle, href }: OtherChannelCardProps) {
  const className =
    'flex flex-col items-center gap-2.5 rounded-lg border border-border bg-surface p-8 text-center shadow-sm transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60';
  const inner = (
    <>
      <Text as="span" color="primary">{icon}</Text>
      <div className="mt-1">
        <Text as="h3" variant="h4">{title}</Text>
      </div>
      <MonoBadge>{badge}</MonoBadge>
      <Text as="span" variant="meta" size="xs" color="secondary">{handle}</Text>
    </>
  );

  // Empty-Guard: ohne Profil-URL bleibt die Karte non-interaktiv (kein Link ins Leere).
  if (!href) {
    return <article className={className}>{inner}</article>;
  }

  return (
    <Link
      href={href}
      external
      variant="channel-card"
      aria-label={`${title} – ${handle} (öffnet in neuem Tab)`}
    >
      {inner}
    </Link>
  );
}

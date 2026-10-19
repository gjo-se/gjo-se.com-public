import Icon from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';

import { platformConfig } from './SocialLink.utils';

import type { SocialPlatform } from './SocialLink.types';

export interface SocialLinkProps {
  platform: SocialPlatform
  href: string
  label?: string
}

/**
 * SocialLink – Icon + Link für soziale Netzwerke und Kontaktkanäle.
 * No className prop – Styling exclusively via platform/href/label.
 *
 * @example
 * <SocialLink platform="github" href="https://github.com/gjo-se" />
 * <SocialLink platform="mail" href="mailto:hi@gjo-se.com" label="Kontakt" />
 */
export default function SocialLink({ platform, href, label }: SocialLinkProps) {
  const { icon, defaultLabel } = platformConfig[platform];
  const isMailto = href.startsWith('mailto:');

  return (
    <Link
      href={href}
      external={!isMailto}
      variant="muted"
      aria-label={label ?? defaultLabel}
    >
      <Icon name={icon} size="sm" aria-hidden />
      {label && <Text as="span" size="sm">{label}</Text>}
    </Link>
  );
}

export type { SocialPlatform } from './SocialLink.types';

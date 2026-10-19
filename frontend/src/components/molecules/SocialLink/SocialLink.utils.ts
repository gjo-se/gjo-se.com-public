import type { IconName } from '@src/components/primitives/Icon';

import type { SocialPlatform } from './SocialLink.types';

/** Icon + Default-Label je Plattform. */
export const platformConfig: Record<SocialPlatform, { icon: IconName; defaultLabel: string }> = {
  github:   { icon: 'github', defaultLabel: 'GitHub' },
  linkedin: { icon: 'linkedin', defaultLabel: 'LinkedIn' },
  xing:     { icon: 'globe',      defaultLabel: 'XING' },
  mail:     { icon: 'mail',       defaultLabel: 'E-Mail' },
  website:  { icon: 'globe',      defaultLabel: 'Website' },
};

import { describe, expect, it } from 'vitest';

import { getApplicationProfileStreamUrl } from '@src/lib/api/applicationProfileStream';

describe('applicationProfileStream', () => {
  it('builds the generic stream url for a storage key', () => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';

    expect(getApplicationProfileStreamUrl('application-profile/portrait.png')).toBe(
      `${base}/api/v1/stream/application-profile/portrait.png`,
    );
  });

  it('keeps nested storage keys intact', () => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';

    expect(getApplicationProfileStreamUrl('profile/2026/portrait.webp')).toBe(
      `${base}/api/v1/stream/profile/2026/portrait.webp`,
    );
  });
});

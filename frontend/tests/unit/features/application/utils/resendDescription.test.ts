/**
 * Tests: resendDescription
 *
 * Covers the singular/plural count wording, the optional last-sent date and
 * the recipient substitution.
 */

import { describe, expect, it } from 'vitest';

import { buildResendDescription } from '@src/features/application/utils/resendDescription';

describe('buildResendDescription', () => {
  it('uses the singular wording for a single previous send', () => {
    const text = buildResendDescription(1, null, 'Acme GmbH');

    expect(text).toContain('bereits einmal gesendet');
    expect(text).toContain('Erneut an Acme GmbH senden?');
    expect(text).not.toContain('zuletzt am');
  });

  it('uses the plural wording for multiple sends', () => {
    const text = buildResendDescription(3, null, 'Acme GmbH');

    expect(text).toContain('bereits 3-mal gesendet');
  });

  it('includes the formatted last-sent date when present', () => {
    const text = buildResendDescription(2, '2026-03-04T10:00:00Z', 'Acme GmbH');

    expect(text).toMatch(/zuletzt am \d{2}\.\d{2}\.\d{4}/);
  });
});

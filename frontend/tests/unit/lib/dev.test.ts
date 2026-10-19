/**
 * Tests: devUsers – contract for the DEV-only login shortcuts.
 *
 * The dev-login flow depends on these exact accounts, so the fixture list is a
 * stable data contract: admin and dev user, both on the project domain.
 */
import { describe, expect, it } from 'vitest';

import { devUsers } from '@src/lib/dev';

describe('devUsers', () => {
  it('enthält genau den Admin- und den Dev-User-Account', () => {
    expect(devUsers.map((user) => user.email)).toEqual(['admin@gjo.com', 'dev@gjo.com']);
  });

  it('beschriftet die beiden Accounts eindeutig', () => {
    expect(devUsers.map((user) => user.label)).toEqual(['Admin', 'Dev-User']);
  });

  it('verwendet ausschließlich projektinterne Adressen', () => {
    for (const user of devUsers) {
      expect(user.email.endsWith('@gjo.com')).toBe(true);
    }
  });
});

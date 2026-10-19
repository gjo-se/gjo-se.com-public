/**
 * Tests: autoGenerateId
 *
 * Verifies the URL-safe id derivation: lower-casing, whitespace collapsing,
 * removal of unsupported characters, dash trimming, and the `untitled`
 * fallback for inputs that lose every character.
 */

import { describe, expect, it } from 'vitest';

import { autoGenerateId } from '@src/features/viscera/viewer/utils/autoGenerateId';

describe('autoGenerateId', () => {
  it('erzeugt aus einem Anzeigenamen einen Slug', () => {
    expect(autoGenerateId('My Service')).toBe('my-service');
  });

  it('wandelt Großbuchstaben in Kleinbuchstaben um', () => {
    expect(autoGenerateId('BACKEND')).toBe('backend');
  });

  it('kollabiert mehrere Leerzeichen zu einem Bindestrich', () => {
    expect(autoGenerateId('Auth   Service')).toBe('auth-service');
  });

  it('entfernt unzulässige Sonderzeichen', () => {
    expect(autoGenerateId('Node.js API')).toBe('nodejs-api');
  });

  it('entfernt führende und abschließende Bindestriche', () => {
    expect(autoGenerateId('--Hello--')).toBe('hello');
  });

  it('behält Ziffern im Slug', () => {
    expect(autoGenerateId('Service 2')).toBe('service-2');
  });

  it('liefert untitled für einen leeren Namen', () => {
    expect(autoGenerateId('')).toBe('untitled');
  });

  it('liefert untitled, wenn nur unzulässige Zeichen übrig bleiben', () => {
    expect(autoGenerateId('###')).toBe('untitled');
    expect(autoGenerateId('   ')).toBe('untitled');
  });
});

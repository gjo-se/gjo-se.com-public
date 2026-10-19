/** En-Dash placeholder shown for empty values. */
export const DASH = '\u2013';

/**
 * Shows the en-dash placeholder for empty prop values.
 *
 * @param value Raw prop value (may be blank).
 * @returns The trimmed value, or the dash when blank.
 */
export function displayName(value: string): string {
  return value.trim() === '' ? DASH : value;
}

/**
 * Maps a normalised Hunter error code to a user-facing German message.
 *
 * @param code Normalised Hunter error code.
 * @returns German message describing the failure.
 */
export function hunterErrorMessage(code: string): string {
  switch (code) {
    case 'insufficient_credits':
      return 'Das Hunter.io-Kontingent ist aufgebraucht – es konnten keine Kontaktdaten abgerufen werden. Bitte den API-Key wechseln oder den Plan upgraden.';
    case 'unauthorized':
      return 'Der Hunter.io-API-Key wurde abgelehnt – es konnten keine Kontaktdaten abgerufen werden.';
    default:
      return 'Die Kontaktdaten konnten nicht bei Hunter.io abgerufen werden (technischer Fehler).';
  }
}

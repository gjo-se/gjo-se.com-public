/**
 * resendDescription – Bestätigungstext für das erneute Senden einer Bewerbung.
 */

import { formatDate } from '@src/lib/formatDate';

/** Builds the resend-confirmation text for an already-sent submission. */
export function buildResendDescription(
  outboundCount: number,
  lastSentAt: string | null,
  recipientName: string,
): string {
  const count = outboundCount === 1 ? 'einmal' : `${outboundCount}-mal`;
  const when = lastSentAt ? ` (zuletzt am ${formatDate(lastSentAt)})` : '';
  return `Die Bewerbung wurde bereits ${count} gesendet${when}. `
    + `Erneut an ${recipientName} senden? `
    + 'Dieselbe Mail und das CV werden ein weiteres Mal verschickt.';
}

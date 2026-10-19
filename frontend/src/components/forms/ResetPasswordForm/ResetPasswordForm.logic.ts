import axios from 'axios';

/** Extracts a user-facing error message and expiry flag from an unknown error. */
export function extractResetError(err: unknown): { expired: boolean; message: string } {
  if (axios.isAxiosError(err)) {
    const detail: string = err.response?.data?.detail ?? '';
    if (detail.toLowerCase().includes('expired')) {
      return { expired: true, message: 'Dieser Link ist abgelaufen. Bitte fordere einen neuen Reset-Link an.' };
    }
    return { expired: false, message: 'Dieser Link ist ungültig oder wurde bereits verwendet.' };
  }
  return { expired: false, message: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.' };
}

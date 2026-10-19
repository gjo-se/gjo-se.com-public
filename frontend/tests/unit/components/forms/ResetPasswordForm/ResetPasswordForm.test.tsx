import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { extractResetError } from '@src/components/forms/ResetPasswordForm/ResetPasswordForm.logic';

describe('extractResetError', () => {
  it('returns expired=true when detail contains "expired"', () => {
    const err = new AxiosError('Request failed');
    err.response = {
      data: { detail: 'Token has expired' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };

    const result = extractResetError(err);

    expect(result.expired).toBe(true);
    expect(result.message).toBe('Dieser Link ist abgelaufen. Bitte fordere einen neuen Reset-Link an.');
  });

  it('returns expired=false for other Axios detail messages', () => {
    const err = new AxiosError('Request failed');
    err.response = {
      data: { detail: 'Token is invalid' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };

    const result = extractResetError(err);

    expect(result.expired).toBe(false);
    expect(result.message).toBe('Dieser Link ist ungültig oder wurde bereits verwendet.');
  });

  it('returns fallback message for unknown error types', () => {
    const err = new Error('network failure');

    const result = extractResetError(err);

    expect(result.expired).toBe(false);
    expect(result.message).toBe('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
  });

  it('returns fallback message for Axios error without response detail', () => {
    const err = new AxiosError('No response');

    const result = extractResetError(err);

    expect(result.expired).toBe(false);
    expect(result.message).toBe('Dieser Link ist ungültig oder wurde bereits verwendet.');
  });

  it('returns fallback message for completely unknown value', () => {
    const result = extractResetError('string error');

    expect(result.expired).toBe(false);
    expect(result.message).toBe('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
  });
});

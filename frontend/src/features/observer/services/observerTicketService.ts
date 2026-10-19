import axios from 'axios';

import type { ObserverTicket } from '@src/features/observer/core/types';
import { api } from '@src/lib/api/axios';

const BASE = '/admin/llm/observer/tickets';

/**
 *
 */
export async function fetchTickets(): Promise<ObserverTicket[]> {
  const res = await api.get<ObserverTicket[]>(BASE);
  return res.data;
}

/**
 * Sendet einen Test-Push auf das konfigurierte ntfy-Topic, um das
 * Telefon-Abo zu verifizieren. Fehler werden als { ok: false, error } gemeldet.
 */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await api.post<{ ok: boolean; error?: string }>('/admin/llm/observer/push-test');
    return res.data;
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? (err.response?.data as { detail?: string } | undefined)?.detail
      : undefined;
    return { ok: false, error: detail ?? 'Test-Push fehlgeschlagen' };
  }
}

/**
 *
 */
export async function updateTicketStatus(
  ticketId: number,
  status: string,
): Promise<ObserverTicket> {
  const res = await api.patch<ObserverTicket>(`${BASE}/${ticketId}`, { status });
  return res.data;
}

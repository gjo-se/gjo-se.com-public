/**
 * contactService – Typisierte API-Funktionen für das Kontakt-Feature.
 *
 * Public (kein JWT):
 *   GET  /api/v1/public/contact/token – kurzlebigen, signierten Form-Token holen
 *   POST /api/v1/public/contact – Submission senden (inkl. Spam-Schutz-Felder)
 *
 * Admin (JWT mit role='admin'):
 *   GET    /api/v1/admin/contact – Liste aller Submissions (neueste zuerst)
 *   DELETE /api/v1/admin/contact/{id} – Submission löschen
 *
 * Verwendet die projektweite axios-Instanz (api.get/api.post/api.delete) –
 * die Basis-URL ist bereits `${VITE_API_BASE_URL}/api/v1`.
 */
import type { Language } from '@src/contexts/LanguageContext';
import api from '@src/lib/api/axios';

/** Admin-Out einer Kontakt-Submission (rohe Inbound-Daten, kein Edit). */
export interface ContactSubmissionOut {
  id: number;
  name: string;
  email: string;
  message: string;
  page: string | null;
  /** Client-IP zum Request-Zeitpunkt – nur intern für Muster-/Block-Analyse. */
  ip: string | null;
  lang: Language;
  /** True, wenn die Submission als Spam klassifiziert wurde (still verworfen, keine Mails). */
  is_spam: boolean;
  /** Auslöser der Spam-Klassifizierung (honeypot/token/content) oder null. */
  spam_reason: string | null;
  created_at: string;
}

/** Payload des Kontakt-Formulars. `honeypot` und `token` dienen dem Spam-Schutz. */
export interface ContactSubmissionPayload {
  name: string;
  email: string;
  message: string;
  page?: string | null;
  lang: Language;
  honeypot?: string | null;
  token: string;
}

/** DELETE /api/v1/admin/contact/{id} – Löscht eine Submission. */
export async function deleteContactSubmission(id: number): Promise<void> {
  await api.delete(`/admin/contact/${id}`);
}

/** GET /api/v1/public/contact/token – Holt einen kurzlebigen, server-signierten Token. */
export async function fetchContactToken(): Promise<string> {
  const res = await api.get<{ token: string }>('/public/contact/token');
  return res.data.token;
}

/** GET /api/v1/admin/contact – Liste aller Submissions (neueste zuerst). */
export async function listContactSubmissions(): Promise<ContactSubmissionOut[]> {
  const res = await api.get<ContactSubmissionOut[]>('/admin/contact');
  return res.data;
}

/** POST /api/v1/public/contact – Sendet die Submission und wirft bei Fehler eine Exception. */
export async function submitContact(payload: ContactSubmissionPayload): Promise<void> {
  await api.post('/public/contact', payload);
}

/**
 * ObjectStorePicker.service – Zentraler FE-Service für das Backend-Asset-Modul.
 *
 * Konsumiert den generischen ObjectStore-Upload-Endpoint
 * ``POST /admin/object-store/assets`` (Multipart, FormData ``file`` + ``prefix``).
 * Ein neues Bild braucht nur einen Prefix – kein neuer Upload-Code.
 */

import { throwResponseError } from '@src/lib/api/apiFetch';

export type { AssetInfo } from '@src/lib/api/assetTypes';

export interface UploadedObjectStoreAsset {
  key: string;
  webpKey: string | null;
}

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1/admin/object-store`;
const opts: RequestInit = { credentials: 'include' };

/**
 * DELETE /admin/object-store/assets/{key} – Entfernt ein Asset (inkl. ggf.
 * vorhandener WebP-Variante) aus dem ObjectStore.
 *
 * @param key Der zu löschende Storage-Key.
 */
export async function deleteObjectStoreAsset(key: string): Promise<void> {
  const res = await fetch(`${BASE}/assets/${encodeURIComponent(key)}`, {
    ...opts,
    method: 'DELETE',
  });
  if (!res.ok) await throwResponseError(res);
}

/** Wirft einen Error mit Status und Detail auf Non-ok-Antworten. */
/**
 * POST /admin/object-store/assets – Lädt eine Bilddatei hoch und gibt den
 * generierten Storage-Key (sowie optionalen WebP-Key) zurück.
 *
 * Multipart-Upload (SVG/PNG/JPEG/WebP, max. 5 MB). Kein Content-Type-Header
 * wird explizit gesetzt, damit der Browser die Multipart-Boundary ergänzt.
 *
 * @param file Die hochzuladende Bilddatei.
 * @param prefix Optionaler ObjectStore-Key-Prefix (Ordner), z.B. "profile/".
 * @returns Das Asset-Ergebnis mit generiertem ``key`` und optionalem ``webpKey``.
 */
export async function uploadObjectStoreAsset(
  file: File,
  prefix?: string,
): Promise<UploadedObjectStoreAsset> {
  const formData = new FormData();
  formData.append('file', file);
  if (prefix) formData.append('prefix', prefix);
  const res = await fetch(`${BASE}/assets`, {
    ...opts,
    method: 'POST',
    body: formData,
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<UploadedObjectStoreAsset>;
}

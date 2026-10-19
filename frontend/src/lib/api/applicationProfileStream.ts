/**
 * applicationProfileStream – Stream-URL für Profil-Assets.
 *
 * Kapselt die Ableitung der öffentlichen Stream-URL aus einem Storage-Key
 * (SOTA-Image-Pattern) getrennt vom API-Service (`applicationProfile`).
 */

import { getStreamUrl } from '@src/lib/getStreamUrl';

/**
 * Builds the public stream URL for a stored object-store key (SOTA image
 * pattern). The BE returns a storage key (never a URL); the FE derives the
 * stream URL from it via the shared `getStreamUrl` helper (generic stream
 * endpoint).
 */
export const getApplicationProfileStreamUrl = (key: string): string => getStreamUrl(key);

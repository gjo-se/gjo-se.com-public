/**
 * siteContent – public site content API client.
 *
 * Localized copy served by the core_site_content API (public, read-only).
 * Lives in the API client layer so shared hooks (src/hooks/) stay API-agnostic
 * (shared-layer-purity) and boundary rules (shared-hooks → lib) hold.
 */

import api from './axios';

export type SiteContentData = Record<string, string>;

/** Fetch all public content values for a language, keyed by content key. */
export async function fetchPublicSiteContent(lang: string): Promise<SiteContentData> {
  const response = await api.get<SiteContentData>(`/public/content/${lang}`);
  return response.data;
}

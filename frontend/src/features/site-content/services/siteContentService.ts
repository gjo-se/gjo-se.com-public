/**
 * siteContentService – API client for core_site_content admin CRUD.
 */

import api from '@src/lib/api/axios';

export interface SiteContentRow {
  key: string;
  language: string;
  value: string | null;
  updated_at: string;
}

const BASE = '/admin/content';

/** Fetch all site content rows. */
export async function fetchSiteContent(): Promise<SiteContentRow[]> {
  const response = await api.get<SiteContentRow[]>(BASE);
  return response.data;
}

/** Update a single site content value for a given key and language. */
export async function updateSiteContentValue(
  key: string,
  language: string,
  value: string,
): Promise<SiteContentRow> {
  const response = await api.put<SiteContentRow>(
    `${BASE}/${encodeURIComponent(key)}/${encodeURIComponent(language)}`,
    { value },
  );
  return response.data;
}

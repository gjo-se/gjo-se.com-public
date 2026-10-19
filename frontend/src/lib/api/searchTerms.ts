/**
 * SearchTerm API service (FBF domain).
 *
 * Admin CRUD + public active-list for scraper search terms.
 * Admin endpoints require a valid JWT cookie with role='admin'.
 */

import { api } from '@src/lib/api/axios';

/** A scraper search term with its name and core status. */
export interface SearchTerm {
  id: number
  name: string
  reference_count: number
  status: string | null
  status_color_token: string | null
}

/** Payload for creating a new search term. */
export interface SearchTermCreate {
  name: string
}

/** Payload for updating a search term's name. */
export interface SearchTermUpdate {
  name?: string
}

const adminBase = '/admin/fbf/search-term';

/** Creates a new search term via POST /admin/fbf/search-term. */
export async function createSearchTerm(data: SearchTermCreate): Promise<SearchTerm> {
  const response = await api.post<SearchTerm>(adminBase, data);
  return response.data;
}

/** Permanently deletes a search term via DELETE /admin/fbf/search-term/{id}. */
export async function deleteSearchTerm(id: number): Promise<void> {
  await api.delete(`${adminBase}/${id}`);
}

/** Fetches all active search terms from the public FBF endpoint. */
export async function fetchActiveSearchTerms(): Promise<SearchTerm[]> {
  const response = await api.get<SearchTerm[]>('/public/fbf/search-term');
  return response.data;
}

/** Fetches all search terms (incl. inactive) for the admin panel. */
export async function fetchAllSearchTerms(): Promise<SearchTerm[]> {
  const response = await api.get<SearchTerm[]>(adminBase);
  return response.data;
}

/** Updates a search term via PUT /admin/fbf/search-term/{id}. */
export async function updateSearchTerm(id: number, data: SearchTermUpdate): Promise<SearchTerm> {
  const response = await api.put<SearchTerm>(`${adminBase}/${id}`, data);
  return response.data;
}

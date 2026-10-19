/**
 * Raw Freelancermap dataset endpoints.
 */
import { api } from '@src/lib/api/axios';

import { fmBase } from './aiscopeEndpoints';

/** A raw freelancermap dataset entry (before normalisation). */
export interface ProjectFreelancerMap {
  id: number
  external_id: string
  url: string
  title: string
  description: string | null
  agency: string | null
  contact_name: string | null
  city: string | null
  country: string | null
  remote_percent: number | null
  contract_type: string | null
  duration: number | null
  start_date: string | null
  skills: string[] | null
  industry: string | null
  extension_possible: boolean | null
  endcustomer: boolean | null
  search_term_id: number | null
  search_term_name: string | null
  posted_at: string
  scraped_at: string
  mapped_at: string | null
}

/** Returns the total count of filtered Freelancermap projects via GET /admin/fbf/raw/freelancermap/count. */
export async function fetchFreelancermapCount(params: {
  q?: string
  search_term_id?: number
}): Promise<number> {
  const response = await api.get<{ total: number }>(`${fmBase}/count`, { params });
  return response.data.total;
}

/** Fetches a single Freelancermap project by ID via GET /admin/fbf/raw/freelancermap/{id}. */
export async function fetchFreelancermapProject(id: number): Promise<ProjectFreelancerMap> {
  const response = await api.get<ProjectFreelancerMap>(`${fmBase}/${id}`);
  return response.data;
}

/** Fetches paginated Freelancermap projects with optional filters via GET /admin/fbf/raw/freelancermap. */
export async function fetchFreelancermapProjects(params: {
  q?: string
  search_term_id?: number
  offset?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}): Promise<ProjectFreelancerMap[]> {
  const response = await api.get<ProjectFreelancerMap[]>(fmBase, { params });
  return response.data;
}

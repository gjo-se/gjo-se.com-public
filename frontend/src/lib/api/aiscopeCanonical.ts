/**
 * Freelancermap ↔ normalised-project canonical linking endpoints.
 */
import { api } from '@src/lib/api/axios';

import { overrideBase } from './aiscopeEndpoints';

/** A single cousin project from the cousins endpoint. */
export interface CousinProject {
  project_id: number
  title: string
  city: string | null
  similarity: number
}

/** Response from the cousins endpoint. */
export interface CousinsResponse {
  freelancermap_id: number
  cousins: CousinProject[]
}

/** Response from the set-canonical endpoint. */
export interface SetCanonicalResponse {
  status: string
  project_id?: number | null
  freelancermap_id?: number | null
  canonical_project_id: number | null
}

/** Response from the switch-canonical endpoint. */
export interface SwitchCanonicalResponse {
  status: string
  old_project_id: number
  new_project_id: number
}

/** Response from the unlink endpoint. */
export interface UnlinkResponse {
  status: string
  freelancermap_id: number
}

/** Fetches top-10 similar canonical projects via POST .../cousins. */
export async function fetchCousins(freelancermapId: number): Promise<CousinsResponse> {
  const response = await api.post<CousinsResponse>(`${overrideBase}/${freelancermapId}/cousins`);
  return response.data;
}

/** Manually link or unlink a Freelancermap entry via POST .../set-canonical. */
export async function setCanonical(
  freelancermapId: number,
  canonicalProjectId: number | null,
): Promise<SetCanonicalResponse> {
  const response = await api.post<SetCanonicalResponse>(`${overrideBase}/${freelancermapId}/set-canonical`, {
    canonical_project_id: canonicalProjectId,
  });
  return response.data;
}

/** Promotes a Freelancermap entry to become the new canonical Project via POST .../switch-canonical. */
export async function switchCanonical(freelancermapId: number): Promise<SwitchCanonicalResponse> {
  const response = await api.post<SwitchCanonicalResponse>(`${overrideBase}/${freelancermapId}/switch-canonical`);
  return response.data;
}

/** Detaches a Freelancermap entry from its canonical Project via POST .../unlink. */
export async function unlinkFreelancermapEntry(freelancermapId: number): Promise<UnlinkResponse> {
  const response = await api.post<UnlinkResponse>(`${overrideBase}/${freelancermapId}/unlink`);
  return response.data;
}

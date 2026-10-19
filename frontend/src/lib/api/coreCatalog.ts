/**
 * coreService – Admin CRUD endpoints for core tags and status definitions.
 */

import api from '@src/lib/api/axios';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CoreStatusCreate {
  name: string;
  slug?: string;
  category: string;
  color_token: string;
  description?: string | null;
  sort_order?: number;
}

export interface CoreStatusOut {
  id: number;
  name: string;
  slug: string;
  category: string;
  color_token: string;
  description: string | null;
  sort_order: number;
  scope: string[] | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CoreStatusUpdate {
  name?: string | null;
  category?: string | null;
  color_token?: string | null;
  description?: string | null;
  sort_order?: number | null;
}

export interface CoreTagCreate {
  name: string;
  slug?: string;
  category: string;
  color_token: string;
  description?: string | null;
  sort_order?: number;
}

export interface CoreTagOut {
  id: number;
  name: string;
  slug: string;
  category: string;
  color_token: string;
  description: string | null;
  sort_order: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CoreTagUpdate {
  name?: string | null;
  category?: string | null;
  color_token?: string | null;
  description?: string | null;
  sort_order?: number | null;
}

export interface TaggableOut {
  tag_id: number;
  taggable_type: string;
  taggable_id: number;
  tag_name: string;
  tag_category: string;
  tag_color_token: string;
}

export interface TagUsageSummary {
  taggable_type: string;
  count: number;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/** Creates a new core status. */
export function createCoreStatus(data: CoreStatusCreate): Promise<CoreStatusOut> {
  return api.post<CoreStatusOut>('/admin/status', data).then((r) => r.data);
}

/** Creates a new core tag. */
export function createCoreTag(data: CoreTagCreate): Promise<CoreTagOut> {
  return api.post<CoreTagOut>('/admin/tagging/tags', data).then((r) => r.data);
}

/** Deletes a core status. */
export function deleteCoreStatus(id: number): Promise<void> {
  return api.delete(`/admin/status/${id}`).then(() => undefined);
}

/** Deletes a core tag. */
export function deleteCoreTag(id: number): Promise<void> {
  return api.delete(`/admin/tagging/tags/${id}`).then(() => undefined);
}

/** Fetches all core statuses, optionally filtered by category or statusable_type (scope). */
export function fetchCoreStatuses(category?: string, statusableType?: string): Promise<CoreStatusOut[]> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (statusableType) params.statusable_type = statusableType;
  return api
    .get<CoreStatusOut[]>('/admin/status', { params: Object.keys(params).length > 0 ? params : undefined })
    .then((r) => r.data);
}

/** Fetches all core tags, optionally filtered by category, search query, or taggable_type. */
export function fetchCoreTags(
  category?: string,
  query?: string,
  taggableType?: string,
): Promise<CoreTagOut[]> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (query) params.q = query;
  if (taggableType) params.taggable_type = taggableType;
  return api
    .get<CoreTagOut[]>('/admin/tagging/tags', { params: Object.keys(params).length > 0 ? params : undefined })
    .then((r) => r.data);
}

/** Fetches tag usage summary (taggable_type → count) for a given tag. */
export function fetchCoreTagUsage(tagId: number): Promise<TagUsageSummary[]> {
  return api
    .get<TagUsageSummary[]>(`/admin/tagging/tags/${tagId}/usage`)
    .then((r) => r.data);
}

/** Fetches tag assignments for a taggable entity (e.g. "fbf_skill"/123). */
export function fetchTaggableTags(taggableType: string, taggableId: number): Promise<TaggableOut[]> {
  return api
    .get<TaggableOut[]>(`/admin/tagging/taggable/${taggableType}/${taggableId}`)
    .then((r) => r.data);
}

/** Sets the status for a statusable entity (singular assignment). */
export function setCoreStatus(
  statusableType: string,
  statusableId: number,
  statusId: number,
): Promise<void> {
  return api
    .put(`/admin/status/statusable/${statusableType}/${statusableId}`, { status_id: statusId })
    .then(() => undefined);
}

/** Replaces all tag assignments for a taggable entity. Pass empty array to remove all. */
export function setTaggableTags(
  taggableType: string,
  taggableId: number,
  tagIds: number[],
): Promise<void> {
  return api
    .put(`/admin/tagging/taggable/${taggableType}/${taggableId}`, { tag_ids: tagIds })
    .then(() => undefined);
}

/** Partially updates a core status. */
export function updateCoreStatus(id: number, data: CoreStatusUpdate): Promise<CoreStatusOut> {
  return api.patch<CoreStatusOut>(`/admin/status/${id}`, data).then((r) => r.data);
}

/** Partially updates a core tag. */
export function updateCoreTag(id: number, data: CoreTagUpdate): Promise<CoreTagOut> {
  return api.patch<CoreTagOut>(`/admin/tagging/tags/${id}`, data).then((r) => r.data);
}

/**
 * Unified scraper + mapper run, status, abort and batch-dedup endpoints.
 */
import { api } from '@src/lib/api/axios';

import { batchDedupBase, scraperAbortBase, scraperStatusBase, unifiedScraperBase } from './aiscopeEndpoints';

/** Response of a full batch-dedup run. */
export interface BatchDedupResponse {
  status: string
  total_processed: number
  new_projects: number
  duplicates_found: number
  errors: number
  projects_deleted: number
  stats: MapperStats | null
}

/** Mapper-Stats aus Scraper-Run- und Batch-Dedup-Response. */
export interface MapperStats {
  total_processed: number
  new_projects: number
  duplicates: number
  url_matches: number
  errors: number
  embedding_calls: number
  embedding_tokens: number
  estimated_cost: number
}

/** Result of a scraper run containing status, the number of saved items, and detailed stats. */
export interface ScraperRunResult {
  status: 'done' | 'error' | 'started' | 'launched'
  saved: number
  /** Present only for the prod Fargate dispatch (`status: 'launched'`). */
  task_arn?: string
  stats?: MapperStats
}

/** Live progress of a scraper+mapper run (GET /scraper/status). */
export interface ScraperStatus {
  running: boolean
  phase: 'idle' | 'scraping' | 'mapping' | 'done' | 'error'
  started_at: number
  scraper_role: string
  scraper_roles_total: number
  scraper_roles_done: number
  scraper_page: number
  scraper_pages_total: number
  scraper_saved: number
  mapper_total: number
  mapper_processed: number
  mapper_new: number
  mapper_duplicates: number
  mapper_url_matches: number
  mapper_errors: number
  stats: MapperStats | null
  error: string
}

/** Requests abort of the running scraper+mapper via POST /admin/fbf/scraper/abort. */
export async function abortScraper(): Promise<void> {
  await api.post(scraperAbortBase);
}

/** Polls the current scraper+mapper progress via GET /admin/fbf/scraper/status. */
export async function fetchScraperStatus(): Promise<ScraperStatus> {
  const response = await api.get<ScraperStatus>(scraperStatusBase);
  return response.data;
}

/** Runs complete batch dedup: deletes all projects, resets PM entries,
 *  clears LanceDB embeddings, and re-runs the mapper.
 *  POST /admin/fbf/batch-dedup/run */
export async function runBatchDedup(): Promise<BatchDedupResponse> {
  const response = await api.post<BatchDedupResponse>(batchDedupBase);
  return response.data;
}

/** Runs the unified scraper for all active portals and triggers the mapper via POST /admin/fbf/scraper/run. */
export async function runScraper(
  maxResults?: number,
  forceAll?: boolean,
): Promise<ScraperRunResult> {
  const body: Record<string, unknown> = {};
  if (maxResults !== undefined) body.max_results = maxResults;
  if (forceAll) body.force_full = true;
  const response = await api.post<ScraperRunResult>(unifiedScraperBase, body);
  return response.data;
}

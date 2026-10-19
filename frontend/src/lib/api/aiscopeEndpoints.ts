/**
 * Shared base paths for the AIScope admin API.
 *
 * Centralised so every resource module (projects, scraper, charts, …) builds
 * its URLs from the same prefixes instead of repeating string literals.
 */
export const fmBase = '/admin/fbf/raw/freelancermap';
export const projectsBase = '/admin/fbf/projects';
export const unifiedScraperBase = '/admin/fbf/scraper/run';
export const scraperStatusBase = '/admin/fbf/scraper/status';
export const scraperAbortBase = '/admin/fbf/scraper/abort';
export const overrideBase = '/admin/fbf/project-freelancer-map';
export const chartsBase = '/admin/fbf/charts';
export const batchDedupBase = '/admin/fbf/batch-dedup/run';

/**
 * AIScope admin API barrel.
 *
 * Re-exports the resource modules (projects, freelancermap, scraper, canonical,
 * charts, skills, llm, merge) so consumers keep importing from
 * `@src/lib/api/aiscope`.
 */
export * from './aiscopeCanonical';
export * from './aiscopeCharts';
export * from './aiscopeFreelancermap';
export * from './aiscopeLlm';
export * from './aiscopeMerge';
export * from './aiscopeProjects';
export * from './aiscopeScraper';
export * from './aiscopeSkills';

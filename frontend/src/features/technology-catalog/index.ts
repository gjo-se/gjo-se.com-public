/**
 * Technology Catalog feature – Public API barrel.
 */
export { fetchTechnologies, fetchTechnologyCount, updateTechnology } from '@src/lib/api/technologyCatalog';
export type {
  TechnologyCatalogEntry,
  TechnologyIcon,
  TechnologyCatalogParams,
  TechnologyListCount,
} from '@src/lib/api/technologyCatalogTypes';
export { useTechnologyCatalogTable } from './hooks/useTechnologyCatalogTable';
export type { UseTechnologyCatalogTableResult } from './hooks/useTechnologyCatalogTable';

/**
 * Technology Catalog feature – TypeScript types.
 *
 * Maps backend Pydantic schemas (TechnologyResponse, TechnologyIconResponse,
 * TechnologyListCountResponse) to TypeScript interfaces for the admin UI.
 */

/** Technology-Katalogeintrag (entspricht TechnologyResponse). */
export interface TechnologyCatalogEntry {
  id: number;
  slug: string;
  slugs: string[] | null;
  name: string;
  name_short: string | null;
  provider: string | null;
  type: string | null;
  color_token: string;
  viscera_restrictions: string[] | null;
  description: string | null;
  website_url: string | null;
  docs_url: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  status_color_token: string | null;
  icons: TechnologyIcon[];
}

/** Query-Parameter für die List-API. */
export interface TechnologyCatalogParams {
  q?: string;
  provider?: string;
  type?: string;
  status?: string;
  offset?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

/** Technology-Icon (entspricht TechnologyIconResponse). */
export interface TechnologyIcon {
  id: number;
  variant: string;
  storage_key: string | null;
  downloaded_at: string | null;
  file_size: number | null;
  svg_storage_key: string | null;
  svg_downloaded_at: string | null;
  svg_file_size: number | null;
  icon_url: string | null;
}

/** Response-Wrapper für den Count-Endpoint (entspricht TechnologyListCountResponse). */
export interface TechnologyListCount {
  total: number;
}

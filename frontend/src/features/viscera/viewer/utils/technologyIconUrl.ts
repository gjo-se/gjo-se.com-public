/**
 * Deterministische Stream-URL für das Icon einer Technology.
 * Der Storage-Key folgt der Konvention `technology-catalog/{slug}_{variant}.svg`
 * (Sync + manuelle Einträge). Variante aus dem globalen dark/light-Mode.
 */
export function technologyIconUrl(slug: string, variant: 'dark' | 'light'): string {
  return `${import.meta.env.VITE_API_BASE_URL}/api/v1/public/technology-catalog/icons/stream/technology-catalog/${encodeURIComponent(slug)}_${variant}.svg`;
}

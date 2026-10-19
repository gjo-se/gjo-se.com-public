import { COLUMNS_CLASS } from './SectionGrid.constants';

import type { SectionGridProps } from './SectionGrid.interface';

/**
 * SectionGrid – geteilte Grid-Grundlage für kuratierte Inhalts-Grids (Portfolio & Skills).
 *
 * Einheitlicher Raster-Rhythmus (`gap-x-8` / `gap-y-16`). Spaltenzahl über `columns`:
 * Default 2 (Portfolio), Skills nutzt 6 (A/B/C-Abstufung via `col-span`). Kinder legen
 * ihre eigene Spannbreite fest; hero-konkurrierende Full-Breite-Karten nutzen
 * `SECTION_GRID_FULL_WIDTH` (2-Spalten) bzw. `SECTION_GRID_6_HIGH` (6-Spalten).
 */
export default function SectionGrid({ children, columns = 2, ...domProps }: SectionGridProps) {
  return (
    <div className={`grid gap-x-8 gap-y-16 ${COLUMNS_CLASS[columns]}`} {...domProps}>
      {children}
    </div>
  );
}

export { SECTION_GRID_6_BASE, SECTION_GRID_6_HIGH, SECTION_GRID_6_MEDIUM, SECTION_GRID_FULL_WIDTH } from './SectionGrid.constants';

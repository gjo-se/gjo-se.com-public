import type { SectionGridProps } from './SectionGrid.interface';

/**
 * Spannbreite für hero-konkurrierende Full-Breite-Sektionen: nimmt beide Grid-Spalten
 * ein (col-span-2), nutzt aber nur 10/12 der Container-Breite und zentriert sich –
 * damit garantiert kleiner als der Hero (21:9). SSOT für Portfolio-Proofs & Skill-Gruppen.
 */
export const SECTION_GRID_FULL_WIDTH = 'md:col-span-2 md:w-10/12 md:mx-auto';

/**
 * Spannbreiten im 6-Spalten-Grid (Skills-Seite, A/B/C-Abstufung über Proportion):
 * high = volle Breite (col-span-6, 10/12), medium = halb (col-span-3, 2 pro Reihe),
 * base = drittel (col-span-2, 3 pro Reihe).
 */
export const SECTION_GRID_6_HIGH = 'md:col-span-6 md:w-10/12 md:mx-auto';
export const SECTION_GRID_6_MEDIUM = 'md:col-span-3';
export const SECTION_GRID_6_BASE = 'md:col-span-2';

/** Statisches Spalten-Mapping (Tailwind purged nur statische Strings). */
export const COLUMNS_CLASS: Record<NonNullable<SectionGridProps['columns']>, string> = {
  2: 'md:grid-cols-2',
  6: 'md:grid-cols-6',
};

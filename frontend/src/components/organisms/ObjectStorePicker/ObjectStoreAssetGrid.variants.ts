import { cva, type VariantProps } from 'class-variance-authority';

/** Thumbnail-Fläche: festes 4:3-Verhältnis, volle Breite, Clipping und Flächen-Grund. */
export const assetThumbVariants = cva(
  'relative aspect-thumb w-full overflow-hidden bg-gray-100 dark:bg-gray-800',
);

/** Zentrierfläche für den Bild-Platzhalter (volle Höhe, mittig). */
export const assetIconCenterVariants = cva('flex h-full items-center justify-center');

/** Schwebender Delete-Button oben rechts – nur bei Hover/Fokus sichtbar. */
export const assetDeleteOverlayVariants = cva(
  'absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
);

/** Beschriftungsblock unter dem Thumbnail (Ordner + Dateiname). */
export const assetCaptionVariants = cva('min-w-0 px-2 py-1.5');

/** Dateiname-Zeile (Umbruch erlaubt, enge Zeilenhöhe). */
export const assetFilenameVariants = cva('break-words leading-tight');

export type ObjectStoreAssetGridVariants = VariantProps<typeof assetThumbVariants>;

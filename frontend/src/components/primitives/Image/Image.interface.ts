import type { ImageVariants } from './Image.variants';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface ImageProps
  extends ImageVariants,
    Omit<ComponentPropsWithoutRef<'img'>, 'className' | 'style' | 'srcSet'> {
  /** Responsive resolution variants: thumbnail (400w) + full (1200w). */
  srcset?: { thumbnail: string; full: string };
  /**
   * URL einer existierenden WebP-Variante des Originals. NUR setzen, wenn die
   * Variante tatsächlich existiert (datengetrieben aus `webpKey`) – ohne sie
   * wird direkt das Original als `<img>` gerendert (kein Auto-Derive).
   */
  webpSrc?: string;
  /**
   * Fertiges responsives WebP-srcset (z. B. `"…800w, …1280w, …1920w"`).
   * Höchste Präzedenz – überschreibt `webpKeys` und `webpSrc` als
   * `<source srcSet>`-Wert.
   */
  webpSrcSet?: string;
  /**
   * Datengesteuertes, ratio-bewusstes WebP-Varianten-Set
   * (Ratio-Label → Width-Label → Storage-Key, z. B.
   * `{ "21-9": { "800": "prefix/uuid.21-9.800.webp", "1280": …, "1920": … } }`).
   * Zusammen mit `ratio` wählt `<Image>` aus `webpKeys[ratio]` das responsive
   * `<source>`-srcset (`…800w, …1280w, …1920w`) über den gemeinsamen
   * `getStreamUrl`-Helper. NUR numerische Width-Labels erzeugen `w`-Deskriptoren;
   * nicht numerische Labels werden übersprungen (kein Mischen von x-/w-
   * Deskriptoren). Ohne `ratio`/`webpKeys` → bisheriges Verhalten (kein Auto-Derive).
   */
  webpKeys?: Record<string, Record<string, string>>;
  /**
   * Gewünschte Bild-Ratio (z. B. `"21-9"`, `"4-3"`, `"16-9"`) – wählt aus
   * `webpKeys` das passende Width-srcset. Wirkungslos ohne `webpKeys`.
   */
  ratio?: string;
  children?: ReactNode;
  /** Fallback rendered when ``src`` is ``null``/empty or the image fails to load. */
  fallback?: ReactNode;
  /**
   * Focal Point für `object-position` (CSS-Wert, z. B. `"50% 40%"`).
   * Nur relevant bei `fit="cover"`: legt fest, welcher Bildpunkt im
   * Container sichtbar bleibt (z. B. der Ring-Mittelpunkt eines Heros,
   * damit er in schmaleren Ratios wie 21:9 nicht aus dem Fenster rutscht).
   * Default: `undefined` → zentriert (`object-center`).
   */
  objectPosition?: string;
}

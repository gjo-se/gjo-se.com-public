import { cn } from '@src/lib/utils';

import type { FullBleedBandProps } from './FullBleedBand.interface';

/**
 * FullBleedBand – randloses Full-Bleed-Band im Variante-C-Stil (wie `.chain`/`.contact`).
 *
 * Der Hintergrund (Surface-Container + obere/untere Haarlinie) bricht mit `100vw` aus dem
 * Container-Layout aus und spannt über die volle Viewport-Breite; der Inhalt bleibt im
 * Container-Rhythmus. Das `100vw`-Break-out erzeugt dank `overflow-x: clip` am Root
 * (index.css) keinen horizontalen Scrollbar. Reines Presentational-Primitive.
 *
 * Der Innen-Container trägt standardmäßig `py-12`; `padding="section"` setzt das
 * Sektions-Padding `py-[clamp(3rem,6vw,6rem)]` (Kanon: Styling ausschließlich über Props).
 */
export default function FullBleedBand({ children, padding = 'default' }: FullBleedBandProps) {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 -left-bleed -right-bleed border-y border-border-light bg-surface-container"
      />
      <div className={cn('relative', padding === 'section' ? 'py-section' : 'py-12')}>
        {children}
      </div>
    </section>
  );
}

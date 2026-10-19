import { statsBandVariants } from './StatsStrip.variants';

export interface StatsStripProps {
  /** Zellen der Leiste – gleich gewichtet, Reihenfolge wie übergeben. */
  items: StatsStripStat[];
  /** Barrierefreie Beschriftung der Sektion. */
  ariaLabel: string;
}

export interface StatsStripStat {
  /** Grosser Wert der Zelle (z. B. Startjahr „2008"). */
  value: string;
  /** Beschriftung der Zelle (z. B. Rolle/Etappe). */
  label: string;
}

/**
 * StatsStrip – eigenständiger Border-Streifen direkt unter dem Home-Hero (Dummy C).
 *
 * Experience-Leiste: die Career-Stationen des Application Profiles als **gleich
 * gewichtete** Zellen (Jahr gross/tabular-nums, Rolle klein) mit vertikaler
 * Border-Trennung – alle Etappen bauen aufeinander auf, keine Hervorhebung.
 * Layout = Grid 3 Spalten, auf schmalen Viewports gestapelt. Presentational –
 * Werte kommen als lokalisierte Strings vom Parent (DB-SSO).
 *
 * Hintergrund = **Surface-Container-Band** wie `FullBleedBand` (Focus/CTA): so trennt
 * die Leiste den Hero klar vom ersten transparenten Abschnitt (Skills) und stellt den
 * Zebra-Rhythmus der Home wieder her.
 *
 * Exakte Dummy-Höhe: `.section--tight` skaliert mit der Viewportbreite
 * (`padding-block: clamp(2rem,3vw,3rem)`), darin der `.stats__strip` mit 24px-Padding.
 * Beide Padding-Ebenen + Zell-Typo werden 1:1 übernommen (kein fixer px-Wert, der nur
 * eine Breite trifft). Full-Bleed-Haarlinien (oben/unten) brechen randlos aus dem
 * Container aus (analog `FullBleedBand`); nur der Inhalt bleibt im Container-Rhythmus.
 */
export type { StatsStripVariants } from './StatsStrip.variants';

export default function StatsStrip({ items, ariaLabel }: StatsStripProps) {
  const monoValue =
    'font-mono text-[clamp(1.5rem,2.6vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.02em] tabular-nums text-on-surface';
  const monoLabel =
    'mt-2 font-mono text-xs font-medium leading-[1.6] uppercase tracking-[0.08em] text-on-surface-muted';

  return (
    <section className="relative reveal" aria-label={ariaLabel}>
      <div
        aria-hidden="true"
        className={statsBandVariants()}
      />
      <div className="relative py-section-tight">
        <div className="grid grid-cols-1 items-center gap-y-8 py-6 sm:grid-cols-3 sm:gap-y-0">
          {items.map((item, index) => (
            <div
              key={item.value}
              className={`flex flex-col ${index > 0 ? 'sm:border-l sm:border-border-light sm:px-8' : 'sm:pr-8'}`}
            >
              <div className={monoValue}>{item.value}</div>
              <div className={monoLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

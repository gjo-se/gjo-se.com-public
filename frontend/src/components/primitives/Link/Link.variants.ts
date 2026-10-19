import { cva, type VariantProps } from 'class-variance-authority';

export const linkVariants = cva('transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring', {
  variants: {
    variant: {
      default: 'inline-flex items-center gap-1 rounded text-primary hover:text-primary-subtle-text hover:underline',
      muted: 'inline-flex items-center gap-1 rounded text-on-surface-subtle hover:text-on-surface-secondary hover:underline',
      danger: 'inline-flex items-center gap-1 rounded text-destructive hover:text-destructive-subtle-text hover:underline',
      ghost: 'inline-flex items-center justify-center gap-1 rounded-md p-1 text-on-surface-subtle hover:text-primary hover:bg-muted dark:hover:bg-muted/50 no-underline',
      card: 'flex flex-col overflow-hidden no-underline',
      /**
       * Weiterführender Content-Link (CTA): Slide-Underline + **persistenter Pfeil**
       * (`→`, von der Komponente angehängt) – damit ist der Link auch ohne Hover
       * (mobil) als Link erkennbar. Nicht für Navigation (Header/Footer) gedacht.
       */
      cta: 'group link-slide inline-flex items-center gap-1.5 rounded text-on-surface-secondary no-underline hover:text-on-surface',
      /**
       * Runder SOS/Contact-CTA (Outline) – Hero-Variante. Ersetzt das frühere
       * freie `className` am Consumer (Kanon: Styling nur über Komponenten-Props).
       */
      sos: 'inline-flex items-center gap-1 rounded text-primary hover:text-primary-subtle-text hover:underline h-14 w-14 shrink-0 justify-center rounded-full border border-border-heavy bg-surface-container font-mono text-xs font-semibold tracking-sos text-primary transition duration-150 hover:-translate-y-px hover:border-primary hover:bg-primary/10 active:translate-y-0 active:duration-100',
      /**
       * Runder SOS/Contact-CTA (gefüllt) – FinalCta-Variante im inneren Kupferkreis.
       * Ersetzt das frühere freie `className` am Consumer.
       */
      'sos-solid': 'flex flex-col overflow-hidden no-underline absolute inset-4 items-center justify-center rounded-full border border-primary-hover bg-sos font-mono text-sos font-semibold tracking-sos-solid text-primary-text shadow-sos-solid transition duration-150 hover:brightness-106',
      /**
       * Portfolio-Kachel im Public-Index (`ProjectCard`) – ganze Karte ist der Link.
       * Ersetzt das frühere freie `className` am Consumer (Kanon: Styling nur über
       * Komponenten-Props).
       */
      'portfolio-tile': 'flex flex-col overflow-hidden no-underline rounded-lg border border-border bg-card text-card-foreground shadow-sm hover:border-primary/60',
      /**
       * Portfolio-Snapshot-Karte (`ProjectFeature`) – Lift + Fokus-Ring, Bild-Zoom via `group`.
       * Ersetzt das frühere freie `className` am Consumer.
       */
      'portfolio-feature': 'group flex flex-col overflow-hidden no-underline rounded-xl border border-border bg-card text-card-foreground shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-subtle-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ring',
      /**
       * Portfolio-Home-Ketten-Phase (`ProjectChain`) – gepolsterte Phasen-Karte.
       * Ersetzt das frühere freie `className` am Consumer.
       */
      'portfolio-chain': 'flex flex-col overflow-hidden no-underline gap-2 rounded-lg border border-border-light bg-surface p-8 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60',
      /**
       * Kategorie-Chip (SkillCategoryNav) – inaktiv.
       * Ersetzt das frühere freie `className` am Consumer.
       */
      chip: 'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-nav-sm leading-chip tracking-chip text-on-surface-secondary no-underline transition-colors duration-150 focus-visible:ring-primary-ring hover:border-primary hover:text-on-surface',
      /**
       * Kategorie-Chip (SkillCategoryNav) – aktiv.
       * Ersetzt das frühere freie `className` am Consumer.
       */
      'chip-active': 'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-primary bg-primary-subtle-bg px-3.5 py-1.5 font-mono text-nav-sm leading-chip tracking-chip text-primary no-underline transition-colors duration-150 focus-visible:ring-primary-ring',
      /**
       * Profil-Kanal-Karte (OtherChannelCard) – die ganze Karte ist der Link.
       * Ersetzt das frühere freie `className` am Consumer.
       */
      'channel-card': 'flex flex-col items-center gap-2.5 rounded-lg border border-border bg-surface p-8 text-center no-underline shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60',
    },
    size: {
      sm: 'text-sm',
      md: '',
    },
  },
});

export type LinkVariants = VariantProps<typeof linkVariants>;

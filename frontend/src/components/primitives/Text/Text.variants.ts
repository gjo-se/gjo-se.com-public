import { cva, type VariantProps } from 'class-variance-authority';

/** Typography variant catalogue for the public and admin Text primitive. */
export const textVariants = cva('', {
  variants: {
    variant: {
      // Kanonischer Public-H1 (Tier L, freistehend) – Größe aus `--text-display-lg`.
      display: 'font-serif text-display-lg font-normal text-balance text-on-surface',
      // Kanonischer Public-H1 (Tier M) für Heads mit Bild/Gegenstand daneben – `--text-display-md`.
      'display-md': 'font-serif text-display-md font-normal text-balance text-on-surface',
      // Kompakter Serif-Titel (Tier M) – Lightbox-/Panel-Kopf, `text-2xl`, Serif, normal.
      headline: 'font-serif text-2xl font-normal tracking-tightest text-on-surface',
      h1: 'text-3xl font-bold tracking-tight text-on-surface',
      h2: 'text-2xl font-bold tracking-tight text-on-surface',
      h3: 'text-xl font-semibold text-on-surface',
      h4: 'text-lg leading-copy font-semibold text-on-surface',
      h5: 'text-base font-medium text-on-surface',
      h6: 'text-sm font-medium text-on-surface',
      subtitle: 'text-lg leading-snug text-on-surface',
      // Public Hero-Subline (Live-Master): 17 px, Zeilenabstand über die Body-Basis 1.55.
      subline: 'text-nav-lg text-on-surface-secondary',
      // Seiten-Intro (enlarged copy) – 18 px, Zeilenabstand 1.55.
      'lead-lg': 'text-lg leading-copy text-on-surface-secondary',
      // Seiten-USP-Zeile (`AI · Architecture · Clean Code`) – 14 px, 0.06em.
      usp: 'font-mono text-sm tracking-usp text-primary',
      body: 'text-base leading-relaxed text-on-surface-secondary',
      label: 'text-sm leading-none text-on-surface-secondary',
      caption: 'text-xs leading-none text-on-surface-subtle',
      mono: 'font-mono text-sm font-medium tracking-wide text-on-surface-secondary',
      // Sektions-Eyebrow (`// …`) – Mono, klein, gesperrt, Kupfer. Entspricht `.eyebrow`
      // inkl. Live-Zeilenabstand 1.6 (`--leading-chip`).
      eyebrow: 'font-mono text-xs uppercase tracking-caps leading-chip text-primary',
      // Größere Eyebrow-Variante (Phasen-Label) – 14 px, Zeilenabstand aus `text-sm`.
      'eyebrow-sm': 'font-mono text-sm uppercase tracking-caps text-primary',
      // Timeline-Jahr (About) – 20 px, Live-Zeilenabstand 1.55.
      year: 'font-mono text-xl leading-copy font-semibold tabular-nums text-on-surface',
      // Kompakte Sektions-Überschrift (Tier S) – Sans, semibold, aus `--text-display-sm`.
      title: 'text-display-sm font-semibold text-on-surface',
      // Kleines Versalien-Label (Menü-Sektionskopf) – 11px mono, gesperrt, gedämpft.
      caps: 'px-2.5 py-1 font-mono text-1xs font-semibold uppercase tracking-label text-on-surface-muted',
      // Mono-Metazeile (USP/Rolle) – Farbe/Gewicht via Props.
      meta: 'font-mono text-sm tracking-label',
      // Kurzer Hinweis neben einem CTA – 13 px, ohne Sperrung (Live-Master).
      hint: 'font-mono text-nav-sm leading-snug',
      // Ruhiger Fließtext unter Karten – 15 px, Zeilenabstand aus der Body-Basis.
      copy: 'text-nav text-on-surface-secondary',
      // Kleingedruckte Mono-Notiz (Footer-CTA) – 13 px, leicht gesperrt.
      note: 'font-mono text-nav-sm tracking-chip',
      // Wortmarke im Drawer – Mono, groß, semibold, eng.
      brand: 'font-mono text-lg font-semibold tracking-tightest text-on-surface',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
    },
    color: {
      default: 'text-on-surface-secondary',
      muted: 'text-on-surface-subtle',
      error: 'text-destructive',
      success: 'text-success',
      primary: 'text-primary',
      secondary: 'text-on-surface-muted',
      /** Subtile Kupfer-Farbe (`text-primary-subtle-text`) – z. B. Proof-Frage-Eyebrow. */
      'primary-subtle': 'text-primary-subtle-text',
      /** Stärkste Textfarbe (entspricht `text-foreground`/`text-on-surface`). */
      'on-surface': 'text-on-surface',
      inherit: 'text-inherit',
      'success-subtle': 'text-success-subtle-text',
      'warning-subtle': 'text-warning-subtle-text',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

export type TextVariants = VariantProps<typeof textVariants>;

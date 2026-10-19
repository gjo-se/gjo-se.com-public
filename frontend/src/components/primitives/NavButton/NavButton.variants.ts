import { cva, type VariantProps } from 'class-variance-authority';

/**
 * NavButton – Appearance-Varianten für Navigations-/Menü-Buttons im Header.
 *
 * Alle Klassen, die früher als freies `className` am Consumer standen, leben hier
 * zentral in der Komponente (Kanon: Styling ausschließlich über Komponenten-Props).
 */
export const navButtonVariants = cva('', {
  variants: {
    variant: {
      /** Menü-Item im Utility-Dropdown. */
      menu: 'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-nav-sm text-on-surface-secondary transition-colors hover:bg-surface-container hover:text-on-surface',
      /** Item im mobilen Drawer. */
      drawer: 'flex w-full cursor-pointer items-center gap-2 rounded-sm py-1 text-left text-nav text-on-surface-secondary transition-colors hover:text-on-surface',
      /** Sprach-Chip (Toggle). */
      chip: 'h-auto cursor-pointer rounded-full border border-border px-3.5 py-1.5 text-sm text-on-surface-secondary',
      /** Quadratischer Icon-Button (z. B. Utility-Zahnrad). */
      icon: 'inline-flex h-8 w-8 items-center justify-center rounded-sm p-0 text-on-surface-muted hover:bg-surface-container hover:text-on-surface-secondary',
      /** Größerer Icon-Button mit Rahmen (Hamburger/Schließen). */
      iconLg: 'inline-flex h-11 w-11 items-center justify-center rounded-md border border-border p-0 text-on-surface-secondary hover:bg-surface-container',
      /** Vollflächiger Backdrop-Scrim (schließt das Menü). */
      scrim: 'absolute inset-0 h-auto w-auto cursor-pointer rounded-none border-0 bg-black/50 p-0',
      /** Klapp-Trigger „Archiviert (n)" – Text-Button der Vergleichstabelle. */
      toggle: 'mb-2 flex cursor-pointer items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground',
      /** Zeilen-Text-Button in Listen (z. B. archivierter Skill) – linksbündig, trunkiert. */
      listItem: 'cursor-pointer truncate text-left text-xs text-muted-foreground transition-colors hover:text-foreground',
      /** Beschreibungs-Tab (inaktiv) der Vergleichstabelle. */
      tab: 'w-full cursor-pointer truncate border-b-2 border-transparent px-3 py-2.5 text-left text-xs font-medium text-on-surface/70 transition-colors hover:bg-gray-50 hover:text-on-surface dark:hover:bg-gray-800/30',
      /** Beschreibungs-Tab (aktiv) der Vergleichstabelle. */
      'tab-active': 'w-full cursor-pointer truncate border-b-2 border-primary bg-gray-50 px-3 py-2.5 text-left text-xs font-medium text-primary dark:bg-gray-800/50',
      /** Beschreibungs-Tab (inaktiv, Merge veraltet) – Amber-Hinweis. */
      'tab-dirty': 'w-full cursor-pointer truncate border-b-2 border-transparent px-3 py-2.5 text-left text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20',
      /** Beschreibungs-Tab (aktiv, Merge veraltet) – Amber-Hinweis. */
      'tab-dirty-active': 'w-full cursor-pointer truncate border-b-2 border-amber-500 bg-amber-50 px-3 py-2.5 text-left text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
      /** Unterstrich-Tab (inaktiv) – kompakte Filter-/Ansicht-Umschaltung. */
      filterTab: 'cursor-pointer border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
      /** Unterstrich-Tab (aktiv) – kompakte Filter-/Ansicht-Umschaltung. */
      filterTabActive: 'cursor-pointer border-b-2 border-primary px-4 py-2 text-sm font-medium text-foreground transition-colors',
    },
    tone: {
      default: '',
      /** Aktiver/Ziel-Zustand – Kupfer + halbfett. */
      primary: 'border-primary font-medium text-primary',
    },
  },
  defaultVariants: {
    variant: 'menu',
    tone: 'default',
  },
});

export type NavButtonVariants = VariantProps<typeof navButtonVariants>;

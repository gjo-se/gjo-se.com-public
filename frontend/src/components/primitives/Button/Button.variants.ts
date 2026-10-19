import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px active:duration-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:brightness-108 hover:-translate-y-px',
        destructive:
          'bg-destructive/10 text-destructive hover:-translate-y-px hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border bg-background shadow-xs hover:-translate-y-px hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:-translate-y-px hover:brightness-105 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        /**
         * Diagramm-Legenden-Eintrag (Toggle) – schlicht, ohne Button-Chrome.
         * Ersetzt das frühere freie `className` am Consumer (Kanon: Styling nur
         * über Komponenten-Props). `legendDim` = gedimmt (anderer Skill aktiv).
         */
        legend:
          'flex cursor-pointer items-center gap-1.5 rounded border-0 bg-transparent px-1.5 py-0.5 text-xs font-normal transition-opacity',
        legendDim:
          'flex cursor-pointer items-center gap-1.5 rounded border-0 bg-transparent px-1.5 py-0.5 text-xs font-normal opacity-30 transition-opacity',
        /**
         * Kontextmenü-/Dropdown-Zeile – volle Breite, linksbündig, ohne
         * Button-Chrome; neutraler Hover. Ersetzt die früheren freien
         * `className`-Übergaben am Consumer (Kanon: Styling nur über Props).
         */
        menu: 'w-full justify-start rounded-none border-0 text-left font-normal hover:bg-gray-50 dark:hover:bg-gray-800',
        /** Kontextmenü-Zeile – blauer Hover (Erstellen/Navigieren). */
        'menu-primary':
          'w-full justify-start rounded-none border-0 text-left font-normal hover:bg-blue-50 dark:hover:bg-blue-950',
        /** Kontextmenü-Zeile – roter Hover (Löschen). */
        'menu-danger':
          'w-full justify-start rounded-none border-0 text-left font-normal hover:bg-red-50 dark:hover:bg-red-950',
        /** Dropdown-Fußzeile – blaue Link-Zeile (z. B. „+ Diagram"). */
        'menu-link':
          'w-full justify-start rounded-none border-0 text-left font-normal text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
        /** Dropdown-Icon-Aktion (Bearbeiten) – grau, blauer Hover. */
        'menu-icon':
          'ml-1 shrink-0 border-0 font-normal text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20',
        /** Dropdown-Icon-Aktion (Löschen) – rot, roter Hover. */
        'menu-icon-danger':
          'ml-1 shrink-0 border-0 font-normal text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20',
        /** Dropdown-Icon-Aktion (Löschen) – aktiver Bestätigungs-Zustand. */
        'menu-icon-danger-active':
          'ml-1 shrink-0 border-0 bg-red-100 font-normal text-red-500 hover:bg-red-50 hover:text-red-700 dark:bg-red-900/40 dark:hover:bg-red-900/20',
        /** Dialog-Fußleiste – flexibler Abbruch-Button (grau). */
        'menu-cancel': 'flex-1 rounded-none border-0 font-normal text-gray-600',
        /** Dialog-Fußleiste – flexibler Bestätigen-Button. */
        'menu-submit': 'flex-1 rounded-none border-0 font-normal',
        /** Kleiner runder Inline-Cancel-Button (×) – grauer Kreis, roter Hover. */
        'cancel-icon':
          'flex h-5 w-5 items-center justify-center rounded-full border-0 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900 dark:hover:text-red-400',
        /** Detail-/Tabellen-Zelle als klickbarer Text-Button (Inline-Edit, groß). */
        cell: 'w-full cursor-pointer rounded px-2 py-0.5 text-left text-sm font-normal hover:bg-gray-100 dark:hover:bg-gray-700 min-h-7',
        /** Detail-Zelle (editierbarer Text) – linksbündig, neutraler Hover. */
        'cell-edit':
          'w-full cursor-pointer rounded px-1 -mx-1 text-left text-sm font-normal text-on-surface-secondary hover:bg-gray-100 dark:hover:bg-gray-700 min-h-5',
        /** Detail-Zelle (URL) – linksbündig, Primärfarbe + gepunktete Unterstreichung. */
        'cell-link':
          'w-full cursor-pointer rounded px-1 -mx-1 text-left text-sm font-normal text-primary underline decoration-dotted underline-offset-2 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-5',
        /** Inline-Entfernen-× (Badge) – neutral, roter Hover. */
        'badge-remove': 'ml-0.5 border-0 bg-transparent p-0 font-normal text-muted-foreground hover:text-red-500',
        /** Inline-Entfernen-× (Chip) – neutral, Foreground-Hover. */
        'chip-remove':
          'ml-0.5 rounded-full border-0 bg-transparent p-0 font-normal text-muted-foreground hover:text-foreground',
        /** Sortier-Drag-Handle – Grab-Cursor, kein Touch-Scroll. */
        drag: 'cursor-grab touch-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
      },
      size: {
        /** Kein Größen-Chrome – nur die Variant-Klassen (z. B. Legenden-Toggle). */
        none: '',
        default:
          'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-btn-xs px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 rounded-btn-sm px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-1.5 px-2.5 text-base leading-copy has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-btn-xs in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-8 rounded-btn-sm in-data-[slot=button-group]:rounded-md',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

import type { ButtonProps } from '@src/components/primitives/Button';

interface ScraperControlsProps {
  inputLabel: string
  inputId: string
  /** Current max results value */
  maxResults: string
  /** Callback when max results changes */
  onMaxResultsChange: (value: string) => void
  /** Scraper button label */
  scraperLabel: string
  /** Whether the scraper button is disabled */
  scraperDisabled: boolean
  /** Scraper button variant */
  scraperVariant: ButtonProps['variant']
  /** Callback when scraper button is clicked */
  onScrape: () => void
  /** Optional utility action button (opens confirmModal when present) */
  utilityAction?: {
    label: string
    disabled: boolean
    variant: ButtonProps['variant']
  }
  /** Optional modal for confirmation */
  confirmModal?: {
    title: string
    description: string
    confirmLabel: string
    confirmDisabled: boolean
    onConfirm: () => void
  }
}

export type { ScraperControlsProps };

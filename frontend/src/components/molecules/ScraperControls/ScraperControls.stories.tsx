import { fn } from 'storybook/test';

import ScraperControls from './ScraperControls';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ScraperControls',
  component: ScraperControls,
  tags: ['autodocs'],
} satisfies Meta<typeof ScraperControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inputLabel: 'Max. Ergebnisse',
    inputId: 'max-results',
    maxResults: '100',
    onMaxResultsChange: fn(),
    scraperLabel: 'Jetzt scrapen',
    scraperDisabled: false,
    scraperVariant: 'primary',
    onScrape: fn(),
  },
};

export const Running: Story = {
  args: {
    inputLabel: 'Max. Ergebnisse',
    inputId: 'max-results',
    maxResults: '100',
    onMaxResultsChange: fn(),
    scraperLabel: 'Läuft…',
    scraperDisabled: true,
    scraperVariant: 'primary',
    onScrape: fn(),
  },
};

export const Done: Story = {
  args: {
    inputLabel: 'Max. Ergebnisse',
    inputId: 'max-results',
    maxResults: '100',
    onMaxResultsChange: fn(),
    scraperLabel: '✓ 42 neu',
    scraperDisabled: false,
    scraperVariant: 'primary',
    onScrape: fn(),
  },
};

export const Error: Story = {
  args: {
    inputLabel: 'Max. Ergebnisse',
    inputId: 'max-results',
    maxResults: '100',
    onMaxResultsChange: fn(),
    scraperLabel: 'Fehler',
    scraperDisabled: false,
    scraperVariant: 'destructive',
    onScrape: fn(),
  },
};

export const WithUtilityActionAndModal: Story = {
  args: {
    inputLabel: 'Max. Ergebnisse',
    inputId: 'max-results',
    maxResults: '100',
    onMaxResultsChange: fn(),
    scraperLabel: 'Jetzt scrapen',
    scraperDisabled: false,
    scraperVariant: 'primary',
    onScrape: fn(),
    utilityAction: {
      label: '↺ Scraps neu einlesen',
      disabled: false,
      variant: 'secondary',
    },
    confirmModal: {
      title: 'GEFÄHRLICH!',
      description: 'Alle Scraps neu einlesen: Setzt mapped_at aller Rohdaten auf NULL.',
      confirmLabel: 'Trotzdem ausführen',
      confirmDisabled: false,
      onConfirm: fn(),
    },
  },
};

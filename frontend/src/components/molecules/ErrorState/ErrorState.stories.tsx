import ErrorState from './ErrorState';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 404-Standardfall: Fehlercode + Titel + Text + Button. */
export const Default: Story = {
  args: {
    code: '404',
    title: 'Seite nicht gefunden',
    description:
      'Die angeforderte Adresse existiert nicht oder wurde verschoben – meist durch einen Tippfehler in der URL oder einen veralteten Link.',
    buttonLabel: 'Zur Startseite',
  },
};

/** Ohne Fehlercode (z. B. unerwarteter Render-Error): nur Titel, Text und Button. */
export const WithoutCode: Story = {
  args: {
    title: 'Etwas ist schiefgelaufen',
    description: 'Die Seite konnte nicht geladen werden. Ein erneuter Versuch führt meist zum Ziel.',
    buttonLabel: 'Erneut versuchen',
  },
};

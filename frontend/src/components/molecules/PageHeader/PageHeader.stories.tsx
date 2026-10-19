import PageHeader from './PageHeader';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default (Admin-/Tool-Seiten): Sans-H1, weight 700. */
export const Default: Story = {
  args: {
    title: 'Portfolio',
    subtitle: 'Ausgewählte Projekte und Fallstudien.',
  },
};

/** Öffentliche Inhaltsseite: Display-Serif-H1 – identisch zum H1 aus `PageIntro`. */
export const Public: Story = {
  args: {
    title: 'Impressum',
    appearance: 'public',
  },
};

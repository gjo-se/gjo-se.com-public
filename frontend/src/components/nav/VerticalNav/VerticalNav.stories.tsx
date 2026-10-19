import VerticalNav from './VerticalNav';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'nav/VerticalNav',
  component: VerticalNav,
  tags: ['autodocs'],
} satisfies Meta<typeof VerticalNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    Collapsible: 'icon',
    collapsible: 'icon',
    variant: 'sidebar',
    size: 'sm',
    tooltip: 'Abmelden',
    name: 'log-out',
  },
};

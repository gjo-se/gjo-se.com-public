import NavigationMenu from './NavigationMenu';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/NavigationMenu',
  component: NavigationMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'navigation-menu',
  },
};

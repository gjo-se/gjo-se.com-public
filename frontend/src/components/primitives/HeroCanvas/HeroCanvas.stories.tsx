import HeroCanvas from './HeroCanvas';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/HeroCanvas',
  component: HeroCanvas,
  tags: ['autodocs'],
} satisfies Meta<typeof HeroCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'HeroCanvas',
  },
};

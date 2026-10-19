import HeroFooter from './HeroFooter';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/HeroFooter',
  component: HeroFooter,
  tags: ['autodocs'],
} satisfies Meta<typeof HeroFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '<title>',
    as: 'h1',
    variant: 'subtitle',
    color: 'muted',
  },
};

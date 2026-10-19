import CookieBanner from './CookieBanner';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/CookieBanner',
  component: CookieBanner,
  tags: ['autodocs'],
} satisfies Meta<typeof CookieBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'dialog',
    label: 'Cookie-Hinweis',
    variant: 'ghost',
    weight: 'semibold',
    color: 'muted',
    size: 'sm',
    children: 'CookieBanner',
  },
};

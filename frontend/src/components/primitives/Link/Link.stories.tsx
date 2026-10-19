import Link from './Link';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Link',
  component: Link,
  tags: ['autodocs'],
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'xs',
    href: '${href}',
    to: '${href}',
    hidden: true,
    name: 'external-link',
    external: false,
    underline: false,
  },
};

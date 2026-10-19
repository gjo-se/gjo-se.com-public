import { fn } from 'storybook/test';

import TagBadge from './TagBadge';

import type { Meta, StoryObj } from '@storybook/react-vite';

const ALL_COLORS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal',
  'cyan', 'sky', 'blue', 'violet', 'pink', 'gray',
] as const;

const meta = {
  title: 'atoms/TagBadge',
  component: TagBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof TagBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Chip variant with amber colour, category shown in tooltip on hover. */
export const Default: Story = {
  args: {
    variant: 'chip',
    colorToken: 'amber',
    name: 'High',
    category: 'Risk',
  },
};

/** Compact inline dot for table cells. */
export const DotVariant: Story = {
  args: {
    variant: 'dot',
    colorToken: 'red',
    name: 'Critical',
  },
};

/** Chip variant with a clickable remove button. */
export const WithRemove: Story = {
  args: {
    variant: 'chip',
    colorToken: 'blue',
    name: 'Frontend',
    onRemove: fn(),
  },
};

/** Smaller size for dense layouts. */
export const SmallSize: Story = {
  args: {
    variant: 'chip',
    colorToken: 'green',
    name: 'Approved',
    size: 'sm',
  },
};

/** Long name – ensures text does not break the layout. */
export const LongName: Story = {
  args: {
    variant: 'chip',
    colorToken: 'amber',
    name: 'Failover / replica',
  },
};

/** All 13 colour tokens at a glance. */
export const Grid: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ALL_COLORS.map((token) => (
        <TagBadge key={token} colorToken={token} name={token} variant="chip" />
      ))}
    </div>
  ),
};

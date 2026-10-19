import StatusBadge from './StatusBadge';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    colorToken: {
      control: 'select',
      options: [
        'red', 'orange', 'amber', 'yellow', 'lime',
        'green', 'teal', 'cyan', 'sky', 'blue',
        'violet', 'pink', 'gray',
      ],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Lifecycle Statuses (badge variant) ──

export const Pending: Story = {
  args: { statusName: 'pending', colorToken: 'amber', category: 'lifecycle' },
};

export const Approved: Story = {
  args: { statusName: 'approved', colorToken: 'green', category: 'lifecycle' },
};

export const Deprecated: Story = {
  args: { statusName: 'deprecated', colorToken: 'gray', category: 'lifecycle' },
};

export const Rejected: Story = {
  args: { statusName: 'rejected', colorToken: 'red', category: 'lifecycle' },
};

// ── Triage Statuses (badge variant) ──

export const New: Story = {
  args: { statusName: 'new', colorToken: 'blue', category: 'triage' },
};

export const Seen: Story = {
  args: { statusName: 'seen', colorToken: 'cyan', category: 'triage' },
};

export const Favorite: Story = {
  args: { statusName: 'favorite', colorToken: 'yellow', category: 'triage' },
};

export const Archived: Story = {
  args: { statusName: 'archived', colorToken: 'gray', category: 'triage' },
};

export const Applied: Story = {
  args: { statusName: 'applied', colorToken: 'sky', category: 'triage' },
};

// ── Dot Variants ──

export const DotPending: Story = {
  args: { statusName: 'pending', colorToken: 'amber', variant: 'dot', category: 'lifecycle' },
};

export const DotRejected: Story = {
  args: { statusName: 'rejected', colorToken: 'red', variant: 'dot', category: 'triage' },
};

// ── Small Size ──

export const SmallPending: Story = {
  args: { statusName: 'pending', colorToken: 'amber', size: 'sm', category: 'lifecycle' },
};

export const SmallApproved: Story = {
  args: { statusName: 'approved', colorToken: 'green', size: 'sm' },
};

// ── Unknown Status (Fallback) ──

export const UnknownStatus: Story = {
  args: { statusName: 'unknown', colorToken: 'gray' },
};

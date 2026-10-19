import StatsStrip from './StatsStrip';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/StatsStrip',
  component: StatsStrip,
  tags: ['autodocs'],
} satisfies Meta<typeof StatsStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    monoValue: 'font-mono text-[clamp(1.5rem,2.6vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.02em] tabular-nums text-on-surface',
    monoLabel: 'mt-2 font-mono text-xs font-medium leading-[1.6] uppercase tracking-[0.08em] text-on-surface-muted',
    hidden: true,
  },
};

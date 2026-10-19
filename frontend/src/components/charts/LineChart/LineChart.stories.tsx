import LineChart from './LineChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof LineChart> = {
  title: 'charts/LineChart',
  component: LineChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LineChart>;

const sampleData = [
  { month: 'Jan', users: 4000, sessions: 2400 },
  { month: 'Feb', users: 3000, sessions: 1398 },
  { month: 'Mär', users: 5000, sessions: 3800 },
  { month: 'Apr', users: 2780, sessions: 3908 },
  { month: 'Mai', users: 1890, sessions: 4800 },
  { month: 'Jun', users: 2390, sessions: 3800 },
];

export const Default: Story = {
  args: {
    data: sampleData,
    xDataKey: 'month',
    lines: [
      { dataKey: 'users', stroke: '#3b82f6', name: 'Benutzer' },
      { dataKey: 'sessions', stroke: '#10b981', name: 'Sitzungen' },
    ],
  },
};

export const SingleLine: Story = {
  args: {
    data: sampleData,
    xDataKey: 'month',
    lines: [{ dataKey: 'users', stroke: '#8b5cf6', name: 'Benutzer', dot: true }],
  },
};

export const Loading: Story = {
  args: {
    data: [],
    xDataKey: 'month',
    lines: [],
    loading: true,
  },
};

export const Error: Story = {
  args: {
    data: [],
    xDataKey: 'month',
    lines: [],
    errorMessage: 'Fehler beim Laden.',
  },
};

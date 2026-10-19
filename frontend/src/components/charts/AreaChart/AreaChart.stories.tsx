import AreaChart from './AreaChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof AreaChart> = {
  title: 'charts/AreaChart',
  component: AreaChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AreaChart>;

const sampleData = [
  { month: 'Jan', revenue: 4000, costs: 2400 },
  { month: 'Feb', revenue: 3000, costs: 1398 },
  { month: 'Mär', revenue: 5000, costs: 3800 },
  { month: 'Apr', revenue: 2780, costs: 3908 },
  { month: 'Mai', revenue: 1890, costs: 4800 },
  { month: 'Jun', revenue: 2390, costs: 3800 },
];

export const Default: Story = {
  args: {
    data: sampleData,
    xDataKey: 'month',
    areas: [
      { dataKey: 'revenue', stroke: '#3b82f6', name: 'Umsatz' },
      { dataKey: 'costs', stroke: '#ef4444', name: 'Kosten' },
    ],
  },
};

export const SingleArea: Story = {
  args: {
    data: sampleData,
    xDataKey: 'month',
    areas: [{ dataKey: 'revenue', stroke: '#10b981', name: 'Umsatz' }],
  },
};

export const Loading: Story = {
  args: {
    data: [],
    xDataKey: 'month',
    areas: [],
    loading: true,
  },
};

export const Error: Story = {
  args: {
    data: [],
    xDataKey: 'month',
    areas: [],
    errorMessage: 'Fehler.',
  },
};

import ComposedChart from './ComposedChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof ComposedChart> = {
  title: 'charts/ComposedChart',
  component: ComposedChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ComposedChart>;

const sampleData = [
  { week: 'KW 1', revenue: 4000, orders: 24 },
  { week: 'KW 2', revenue: 3000, orders: 13 },
  { week: 'KW 3', revenue: 5000, orders: 38 },
  { week: 'KW 4', revenue: 2780, orders: 39 },
  { week: 'KW 5', revenue: 1890, orders: 48 },
  { week: 'KW 6', revenue: 2390, orders: 38 },
  { week: 'KW 7', revenue: 3490, orders: 43 },
];

export const Default: Story = {
  args: {
    chartProps: {
      data: sampleData,
      xDataKey: 'week',
      bars: [{ dataKey: 'revenue', fill: '#3b82f6', name: 'Umsatz' }],
      lines: [{ dataKey: 'orders', stroke: '#ef4444', name: 'Bestellungen' }],
      showLegend: true,
    },
  },
};

export const Loading: Story = {
  args: {
    chartProps: {
      data: [],
      xDataKey: 'week',
      bars: [],
      loading: true,
    },
  },
};

export const Error: Story = {
  args: {
    chartProps: {
      data: [],
      xDataKey: 'week',
      bars: [],
      errorMessage: 'Daten konnten nicht geladen werden.',
    },
  },
};

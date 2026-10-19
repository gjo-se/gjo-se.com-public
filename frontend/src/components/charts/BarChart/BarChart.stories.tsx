import BarChart from './BarChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof BarChart> = {
  title: 'charts/BarChart',
  component: BarChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BarChart>;

const sampleData = [
  { category: 'React', count: 120 },
  { category: 'TypeScript', count: 98 },
  { category: 'Python', count: 85 },
  { category: 'Go', count: 45 },
  { category: 'Rust', count: 32 },
];

export const Default: Story = {
  args: {
    data: sampleData,
    xDataKey: 'category',
    bars: [{ dataKey: 'count', fill: '#3b82f6', name: 'Anzahl' }],
  },
};

export const MultipleBars: Story = {
  args: {
    data: [
      { category: 'Q1', male: 40, female: 24 },
      { category: 'Q2', male: 30, female: 13 },
      { category: 'Q3', male: 20, female: 38 },
    ],
    xDataKey: 'category',
    bars: [
      { dataKey: 'male', fill: '#3b82f6', name: 'Männlich' },
      { dataKey: 'female', fill: '#ec4899', name: 'Weiblich' },
    ],
  },
};

export const Loading: Story = {
  args: {
    data: [],
    xDataKey: 'category',
    bars: [],
    loading: true,
  },
};

export const Error: Story = {
  args: {
    data: [],
    xDataKey: 'category',
    bars: [],
    errorMessage: 'Daten nicht verfügbar.',
  },
};

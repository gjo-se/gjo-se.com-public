import RadialBarChart from './RadialBarChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof RadialBarChart> = {
  title: 'charts/RadialBarChart',
  component: RadialBarChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadialBarChart>;

const sampleData = [
  { name: '18-24', value: 31.47 },
  { name: '25-29', value: 26.69 },
  { name: '30-34', value: 15.69 },
  { name: '35-39', value: 8.22 },
  { name: '40-44', value: 8.63 },
  { name: '45-49', value: 2.3 },
  { name: '50+', value: 2.41 },
];

export const Default: Story = {
  args: {
    data: sampleData,
  },
};

export const Loading: Story = {
  args: {
    data: [],
    loading: true,
  },
};

export const Error: Story = {
  args: {
    data: [],
    errorMessage: 'Fehler.',
  },
};

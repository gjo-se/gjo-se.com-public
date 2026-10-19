import ScatterChart from './ScatterChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof ScatterChart> = {
  title: 'charts/ScatterChart',
  component: ScatterChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ScatterChart>;

const sampleData = [
  {
    name: 'Gruppe A',
    data: [
      { x: 10, y: 20 },
      { x: 12, y: 25 },
      { x: 15, y: 18 },
      { x: 18, y: 30 },
      { x: 20, y: 22 },
    ],
  },
  {
    name: 'Gruppe B',
    data: [
      { x: 8, y: 15 },
      { x: 14, y: 28 },
      { x: 16, y: 20 },
      { x: 22, y: 35 },
      { x: 25, y: 25 },
    ],
  },
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

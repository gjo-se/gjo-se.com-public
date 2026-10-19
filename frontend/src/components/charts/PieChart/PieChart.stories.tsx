import PieChart from './PieChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof PieChart> = {
  title: 'charts/PieChart',
  component: PieChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PieChart>;

const sampleData = [
  { name: 'React', value: 400 },
  { name: 'Vue', value: 300 },
  { name: 'Angular', value: 200 },
  { name: 'Svelte', value: 100 },
];

export const Default: Story = {
  args: {
    data: sampleData,
  },
};

export const Donut: Story = {
  args: {
    data: sampleData,
    donut: true,
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
    errorMessage: 'Laden fehlgeschlagen.',
  },
};

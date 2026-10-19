import { getChartColor } from '../ChartShell/ChartShell.utils';

import RadarChart from './RadarChart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof RadarChart> = {
  title: 'charts/RadarChart',
  component: RadarChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadarChart>;

const sampleData = [
  { subject: 'TypeScript', importance: 5, level: 4 },
  { subject: 'React', importance: 5, level: 5 },
  { subject: 'Node.js', importance: 4, level: 3 },
  { subject: 'Python', importance: 3, level: 4 },
  { subject: 'Docker', importance: 4, level: 3 },
  { subject: 'ECharts', importance: 2, level: 4 },
];

export const Default: Story = {
  args: {
    data: sampleData,
    maxValue: 5,
    radars: [
      {
        dataKey: 'importance',
        name: 'Markt-Relevanz',
        stroke: getChartColor(4), // Salbei
      },
      {
        dataKey: 'level',
        name: 'Mein Level',
        stroke: getChartColor(1), // Kupfer
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    data: [],
    radars: [],
    loading: true,
  },
};

export const Error: Story = {
  args: {
    data: [],
    radars: [],
    errorMessage: 'Fehler.',
  },
};

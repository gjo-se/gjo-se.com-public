import ForceGraph from './ForceGraph';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof ForceGraph> = {
  title: 'charts/ForceGraph',
  component: ForceGraph,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ForceGraph>;

const sampleData = {
  nodes: [
    { id: 'A', name: 'Node A', val: 10, color: '#3b82f6' },
    { id: 'B', name: 'Node B', val: 8, color: '#ef4444' },
    { id: 'C', name: 'Node C', val: 6, color: '#10b981' },
    { id: 'D', name: 'Node D', val: 4, color: '#f59e0b' },
    { id: 'E', name: 'Node E', val: 7, color: '#8b5cf6' },
  ],
  links: [
    { source: 'A', target: 'B', value: 1 },
    { source: 'A', target: 'C', value: 1 },
    { source: 'B', target: 'D', value: 1 },
    { source: 'C', target: 'E', value: 1 },
    { source: 'D', target: 'E', value: 1 },
  ],
};

export const Default: Story = {
  args: {
    nodes: sampleData.nodes,
    links: sampleData.links,
    height: 300,
  },
};

export const Loading: Story = {
  args: {
    nodes: [],
    links: [],
    loading: true,
  },
};

export const Error: Story = {
  args: {
    nodes: [],
    links: [],
    errorMessage: 'Graph konnte nicht geladen werden.',
  },
};

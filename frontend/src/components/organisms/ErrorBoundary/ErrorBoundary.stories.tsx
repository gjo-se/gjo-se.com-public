import ErrorBoundary from './ErrorBoundary';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Alles gut – kein Fehler.',
  },
};

function ThrowingComponent() {
  throw new Error('Test-Fehler');
}

export const WithError: Story = {
  args: {
    children: <ThrowingComponent />,
  },
};

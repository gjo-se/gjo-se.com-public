import Grid from './Grid';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/Grid',
  component: Grid,
  tags: ['autodocs'],
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Ladefehler',
    subtitle: 'Meine Projekte',
    errorMessage: 'Laden fehlgeschlagen',
    code: 500,
    children: 'Grid',
  },
};

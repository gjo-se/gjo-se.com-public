import LegalPage from './LegalPage';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'templates/LegalPage',
  component: LegalPage,
  tags: ['autodocs'],
} satisfies Meta<typeof LegalPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'content',
    appearance: 'public',
    height: 'py-8',
    color: 'muted',
    variant: 'legal',
  },
};

import SideSearch from './SideSearch';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SideSearch',
  component: SideSearch,
  tags: ['autodocs'],
} satisfies Meta<typeof SideSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Suchen...',
    children: 'SideSearch',
  },
};

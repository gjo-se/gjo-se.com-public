import SearchBar from './SearchBar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/SearchBar',
  component: SearchBar,
  tags: ['autodocs'],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Suchen...',
    leftIcon: 'search',
    variant: 'ghost',
    size: 'xs',
    label: 'Suche zurücksetzen',
    name: 'x',
    children: 'SearchBar',
  },
};

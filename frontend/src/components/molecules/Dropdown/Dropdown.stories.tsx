import Dropdown from './Dropdown';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    searchPlaceholder: 'Suchen...',
    placeholder: 'Bitte wählen...',
    leftIcon: 'search',
    haspopup: 'listbox',
    autocomplete: 'list',
    role: 'option',
    variant: 'secondary',
    size: 'xs',
    label: 'Auswahl zurücksetzen',
    name: 'chevron-down',
    as: 'span',
    searchable: false,
    disabled: false,
    children: 'Dropdown',
  },
};

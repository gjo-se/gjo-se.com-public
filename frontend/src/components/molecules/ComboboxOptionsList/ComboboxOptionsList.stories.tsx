import ComboboxOptionsList from './ComboboxOptionsList';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ComboboxOptionsList',
  component: ComboboxOptionsList,
  tags: ['autodocs'],
} satisfies Meta<typeof ComboboxOptionsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};

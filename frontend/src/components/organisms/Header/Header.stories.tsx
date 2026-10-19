import Header from './Header';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/Header',
  component: Header,
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    logo: 'gjo-se.com',
    as: 'span',
    variant: 'ghost',
    weight: 'bold',
    size: 'sm',
    children: 'Header',
  },
};

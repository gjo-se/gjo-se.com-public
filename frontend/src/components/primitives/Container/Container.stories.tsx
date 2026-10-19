import Container from './Container';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Container',
  component: Container,
  tags: ['autodocs'],
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};

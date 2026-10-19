import Audio from './Audio';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Audio',
  component: Audio,
  tags: ['autodocs'],
} satisfies Meta<typeof Audio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};

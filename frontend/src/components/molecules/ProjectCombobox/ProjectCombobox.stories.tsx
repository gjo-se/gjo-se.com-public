import ProjectCombobox from './ProjectCombobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ProjectCombobox',
  component: ProjectCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmVariant: 'dialog',
  },
};

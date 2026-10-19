import TagGroup from './TagGroup';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/TagGroup',
  component: TagGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof TagGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
    children: 'TagGroup',
  },
};

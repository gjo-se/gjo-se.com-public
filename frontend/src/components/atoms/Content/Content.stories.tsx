import Content from './Content';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'atoms/Content',
  component: Content,
  tags: ['autodocs'],
} satisfies Meta<typeof Content>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'home.hero.subline',
    hidden: true,
    height: '1rem',
    width: '60%',
  },
};

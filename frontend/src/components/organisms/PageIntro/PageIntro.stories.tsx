import PageIntro from './PageIntro';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/PageIntro',
  component: PageIntro,
  tags: ['autodocs'],
} satisfies Meta<typeof PageIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    as: 'p',
    variant: 'subtitle',
    color: 'default',
    weight: 'medium',
  },
};

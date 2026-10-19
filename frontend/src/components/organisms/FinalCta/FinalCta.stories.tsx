import FinalCta from './FinalCta';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/FinalCta',
  component: FinalCta,
  tags: ['autodocs'],
} satisfies Meta<typeof FinalCta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    padding: 'section',
    as: 'p',
    variant: 'meta',
    hidden: true,
    color: 'secondary',
    align: 'center',
  },
};

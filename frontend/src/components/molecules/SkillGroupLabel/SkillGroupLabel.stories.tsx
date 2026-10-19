import SkillGroupLabel from './SkillGroupLabel';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SkillGroupLabel',
  component: SkillGroupLabel,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillGroupLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: '<label>',
    as: 'span',
    variant: 'h2',
    size: 'xs',
    weight: 'semibold',
    color: 'muted',
    prominent: false,
  },
};
